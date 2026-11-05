import "server-only"
import {sheetsClient,required} from "../territorial-store"
import {columnLetter} from "../territorial-schema"
import {actorConfig,actorKinds,ActorError,fieldsFor,personSexes,parseActorTable,prepareActor,projectActor,nextActorId,text,type ActorKind,type ActorTable,type ActorReferences,type ActorRow} from "./model"

const cached=new Map<string,{expires:number;data:Record<string,ActorTable>}>(),pending=new Map<string,Promise<Record<string,ActorTable>>>(),generations=new Map<string,number>()
const opts={timeout:15000,retry:false} as const
const licenceIds:Record<string,string>={ATHLETE_LICENCES:"id_licence",ACTEURS_LICENCES:"id_licence"}
export function invalidateActorSource(){cached.clear();pending.clear();for(const key of generations.keys())generations.set(key,(generations.get(key)||0)+1)}
// Territorial writes must also expire affiliation options using the same source.
export function invalidateActorTerritorySource(){
 const id=process.env.FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID?.trim();if(!id)return
 for(const key of new Set([...cached.keys(),...pending.keys(),...generations.keys()]))if(JSON.parse(key)[0]===id){cached.delete(key);pending.delete(key);generations.set(key,(generations.get(key)||0)+1)}
}
export async function readActorSheets(variable:string,sheets:string[],fresh=false,ttl=30000):Promise<Record<string,ActorTable>>{
 const spreadsheetId=required(variable),key=JSON.stringify([spreadsheetId,sheets]),now=Date.now()
 if(!fresh){const hit=cached.get(key);if(hit&&hit.expires>now)return hit.data;const flight=pending.get(key);if(flight)return flight}
 const generation=generations.get(key)||0;generations.set(key,generation)
 const request=(async()=>{
  const response=await sheetsClient().spreadsheets.values.batchGet({spreadsheetId,ranges:sheets.map(s=>`'${s}'!A:AF`)},opts)
   const data=Object.fromEntries(sheets.map((sheet,i)=>{const values=response.data.valueRanges?.[i]?.values||[];const actorKind=actorKinds.find(kind=>actorConfig[kind].sheet===sheet),idKey=actorKind?actorConfig[actorKind].id:licenceIds[sheet]||text(values[0]?.[0]);if(!idKey)throw new ActorError("SCHEMA",`Feuille ${sheet} absente ou sans en-tête.`,503);return [sheet,parseActorTable(values,idKey)]}))
  if(!fresh&&generations.get(key)===generation)cached.set(key,{data,expires:Date.now()+ttl})
  return data
 })()
 if(!fresh)pending.set(key,request)
 try{return await request}finally{if(pending.get(key)===request)pending.delete(key)}
}
export async function actorTable(kind:ActorKind,fresh=false){const c=actorConfig[kind],data=await readActorSheets("FECOT_ACTEURS_SPREADSHEET_ID",[c.sheet],fresh);const table=data[c.sheet];if(!table.headers.includes(c.id)||!["nom_complet","id_sexe","statut"].every(h=>table.headers.includes(h)))throw new ActorError("SCHEMA","Schéma Acteurs FECOT incomplet.",503);return table}
const referenceIds:Record<string,string>={SEXES:"id_sexe",NIVEAUX_COACH:"id_niveau_coach",GRADES_ARBITRES:"id_grade_arbitre",SPECIALITE_MEDECIN:"id_specialite",TYPES_AUTRES_ACTEURS:"id_type_autre_acteur"}
export async function actorReferences(kind:ActorKind,fresh=false):Promise<ActorReferences>{
 const names=["SEXES",...(actorConfig[kind].reference?[actorConfig[kind].reference!]:[])],tables=await readActorSheets("FECOT_REFERENTIELS_SPREADSHEET_ID",names,fresh,300000)
 return Object.fromEntries(names.map(name=>[name,tables[name].rows.filter(r=>r[referenceIds[name]]&&r.statut!=="INACTIF").map(r=>({id:r[referenceIds[name]],label:r[Object.keys(r).find(k=>k.startsWith("nom_"))||""]||r[referenceIds[name]]}))]))
}
export async function listActors(kind:ActorKind){
 const [table,reference]=await Promise.all([actorTable(kind),actorReferences(kind).then(refs=>({refs,available:true})).catch(()=>({refs:{} as ActorReferences,available:false}))])
 return {actors:table.rows.map(row=>projectActor(kind,row,table.headers,reference.refs)).sort((a,b)=>a.values.nom_complet.localeCompare(b.values.nom_complet,"fr",{sensitivity:"base"})||a.id.localeCompare(b.id)),referencesAvailable:reference.available,editorData:reference.available?{kind,fields:fieldsFor(table.headers),references:{...reference.refs,SEXES:personSexes(reference.refs.SEXES||[])}}:null}
}
export async function actorDetail(kind:ActorKind,id:string){
 const table=await actorTable(kind,true),row=table.rows.find(r=>r[actorConfig[kind].id]===id)
 if(!row)throw new ActorError("NOT_FOUND","Acteur introuvable.",404)
 const refs=await actorReferences(kind).catch(()=>({} as ActorReferences))
 return {actor:projectActor(kind,row,table.headers,refs,true),fields:fieldsFor(table.headers)}
}
export async function writeActorFields(kind:ActorKind,table:ActorTable,id:string,record:ActorRow,create=false){
 const client=sheetsClient(),spreadsheetId=required("FECOT_ACTEURS_SPREADSHEET_ID"),c=actorConfig[kind]
 if(Object.keys(record).some(key=>!table.headers.includes(key)))throw new ActorError("SCHEMA","Colonne de destination absente.",503)
 if(create){await client.spreadsheets.values.append({spreadsheetId,range:`'${c.sheet}'!A:AF`,valueInputOption:"RAW",insertDataOption:"INSERT_ROWS",requestBody:{values:[table.headers.map(h=>record[h]??"")]}},opts);return}
 const index=table.headers.indexOf(c.id),matches=table.values.flatMap((r,i)=>i>0&&text(r[index])===id?[i+1]:[])
 if(matches.length!==1)throw new ActorError("NOT_FOUND","Acteur absent ou ambigu.",404)
 const data=Object.entries(record).map(([key,value])=>({range:`'${c.sheet}'!${columnLetter(table.headers.indexOf(key))}${matches[0]}`,values:[[value]]}))
 if(data.length)await client.spreadsheets.values.batchUpdate({spreadsheetId,requestBody:{valueInputOption:"RAW",data}},opts)
}
export async function saveActor(kind:ActorKind,body:unknown,id?:string){
 const [table,refs]=await Promise.all([actorTable(kind,true),actorReferences(kind,true)]),c=actorConfig[kind]
 const prepared=prepareActor(kind,body,table,refs,id),savedId=id||nextActorId(kind,table.rows.map(row=>row[c.id]))
 if(!id){if(table.rows.some(r=>r[c.id]===savedId))throw new ActorError("DUPLICATE","Identifiant déjà attribué.",409);prepared.record[c.id]=savedId}
 try{await writeActorFields(kind,table,savedId,prepared.record,!id)}catch{invalidateActorSource();throw new ActorError("WRITE_UNCERTAIN",`Écriture non confirmée. Rechargez la liste avant toute nouvelle tentative (ID ${savedId}).`,503,{_id:savedId})}
 invalidateActorSource()
 const confirmed=await actorTable(kind,true).catch(()=>null),written=confirmed?.rows.find(r=>r[c.id]===savedId)
 if(!written||Object.entries(prepared.record).some(([k,v])=>written[k]!==v))throw new ActorError("WRITE_UNCERTAIN",`Écriture effectuée mais confirmation indisponible. Rechargez la liste (ID ${savedId}).`,503,{_id:savedId})
 return projectActor(kind,written,confirmed!.headers,refs,true)
}
const queues=new Map<ActorKind,Promise<void>>()
export function actorWriteTurn<T>(kind:ActorKind,work:()=>Promise<T>){const result=(queues.get(kind)||Promise.resolve()).then(work);queues.set(kind,result.then(()=>undefined,()=>undefined));return result}

export async function actorRelations(kind:ActorKind,id:string,section:"affiliations"|"licences"){
 const table=await actorTable(kind,true);if(!table.rows.some(r=>r[actorConfig[kind].id]===id))throw new ActorError("NOT_FOUND","Acteur introuvable.",404)
 const c=actorConfig[kind]
 const affiliationNames:Record<ActorKind,string[]>={athletes:["ATHLETE_AFFILIATIONS"],coachs:["COACH_AFFILIATIONS"],medecins:["MEDECIN_AFFILIATIONS"],officiels:["OFFICIELS_AFFILIATIONS"],arbitres:["ARBITRE_AFFECTATIONS","ARBITRES_GRADES"],"autres-acteurs":["AUTRES_AFFILIATIONS"]}
 const names=section==="licences"?[kind==="athletes"?"ATHLETE_LICENCES":"ACTEURS_LICENCES"]:affiliationNames[kind]
 const data=await readActorSheets(section==="licences"?"FECOT_LICENCES_SPREADSHEET_ID":"FECOT_AFFILIATIONS_SPREADSHEET_ID",names,true)
 let typeIds:string[]=[]
 if(section==="licences"&&kind!=="athletes"){
  const refs=await readActorSheets("FECOT_REFERENTIELS_SPREADSHEET_ID",["TYPES_ACTEURS"])
  typeIds=refs.TYPES_ACTEURS.rows.filter(r=>r.source_donnees===c.sheet).map(r=>r.id_type_acteur)
  if(!typeIds.length)throw new ActorError("REFERENCE","Le type d’acteur n’est pas configuré dans TYPES_ACTEURS ; licences non classifiables.",503)
 }
 return names.map(name=>({sheet:name,headers:data[name].headers,rows:data[name].rows.filter(row=>section==="licences"&&kind!=="athletes"?row.id_acteur===id&&typeIds.includes(row.id_type_acteur):row[c.id]===id)}))
}
