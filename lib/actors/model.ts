// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { formatDateForSheet } from "../compact-date.ts"
export const actorKinds=["athletes","coachs","arbitres","officiels","medecins","autres-acteurs"] as const
export type ActorKind=typeof actorKinds[number]
export type ActorRow=Record<string,string>
export type ActorTable={headers:string[];rows:ActorRow[];values:unknown[][]}
export type ActorOption={id:string;label:string}
export type ActorReferences=Record<string,ActorOption[]>
export type ActorEditorData={kind:ActorKind;fields:ActorField[];references:ActorReferences}
export const actorConfig:Record<ActorKind,{sheet:string;id:string;prefix:string;title:string;extra?:string;reference?:string}>={
 athletes:{sheet:"ATHLETES",id:"id_athlete",prefix:"ATH",title:"Athlètes"},
 coachs:{sheet:"COACHS",id:"id_coach",prefix:"COA",title:"Entraîneurs",extra:"id_niveau",reference:"NIVEAUX_COACH"},
 arbitres:{sheet:"ARBITRES",id:"id_arbitre",prefix:"ARB",title:"Arbitres",extra:"id_grade_arbitre",reference:"GRADES_ARBITRES"},
 officiels:{sheet:"OFFICIELS",id:"id_officiel",prefix:"OFF",title:"Officiels"},
 medecins:{sheet:"MEDECINS",id:"id_medecin",prefix:"MED",title:"Médecins",extra:"id_specialite",reference:"SPECIALITE_MEDECIN"},
 "autres-acteurs":{sheet:"AUTRES",id:"id_autre_acteur",prefix:"AUT",title:"Autres acteurs",extra:"id_type_autre_acteur",reference:"TYPES_AUTRES_ACTEURS"},
}
export type ActorField={key:string;label:string;section:string;type?:"date"|"textarea"|"email"|"reference";required?:boolean}
export const actorFields:ActorField[]=[
 {key:"nom_complet",label:"Nom complet",section:"Identification",required:true},
 {key:"id_national",label:"Identifiant national",section:"Identification"},{key:"id_wt",label:"Identifiant WT",section:"Identification"},
 {key:"id_sexe",label:"Sexe",section:"Identification",type:"reference",required:true},
 {key:"date_naissance",label:"Date de naissance",section:"Identification",type:"date"},{key:"lieu_naissance",label:"Lieu de naissance",section:"Identification"},
 {key:"nationalite",label:"Nationalité",section:"Identification"},{key:"statut",label:"Statut",section:"Identification",type:"reference",required:true},
 {key:"telephone",label:"Téléphone",section:"Coordonnées"},{key:"email",label:"E-mail",section:"Coordonnées",type:"email"},{key:"adresse",label:"Adresse",section:"Coordonnées",type:"textarea"},
 {key:"numero_passeport",label:"Numéro de passeport",section:"Passeport"},{key:"date_delivrance_passeport",label:"Date de délivrance",section:"Passeport",type:"date"},{key:"date_expiration_passeport",label:"Date d’expiration",section:"Passeport",type:"date"},
 {key:"id_niveau",label:"Niveau d’entraîneur",section:"Complément",type:"reference"},{key:"id_grade_arbitre",label:"Grade d’arbitre",section:"Complément",type:"reference"},
 {key:"id_specialite",label:"Spécialité médicale",section:"Complément",type:"reference"},{key:"id_type_autre_acteur",label:"Type d’acteur",section:"Complément",type:"reference"},
 {key:"date_affiliation",label:"Affiliation historique",section:"Complément",type:"date"},{key:"entite",label:"Entité déclarée (texte historique)",section:"Complément"},{key:"observations",label:"Observations",section:"Complément",type:"textarea"},
]
const aliases:Record<string,string[]>={date_naissance:["date_de_naissance","date_naissance"],lieu_naissance:["lieu_de_naissance","lieu_naissance"],numero_passeport:["numero_passeport","numéro_passeport"],date_delivrance_passeport:["date_delivrance_passeport","date_de_delivrance_passeport"],date_expiration_passeport:["date_expiration_passeport","date_expiration passeport"],observations:["observations","observation"]}
export class ActorError extends Error {
 code:string;status:number;fields:Record<string,string>
 constructor(code:string,message:string,status=422,fields:Record<string,string>={}){super(message);this.code=code;this.status=status;this.fields=fields}
}
export const text=(v:unknown)=>v==null?"":String(v).trim()
export function nextActorId(kind:ActorKind,ids:Iterable<string>){
 const prefix=actorConfig[kind].prefix,separator=kind==="coachs"?"-":"",digits=kind==="athletes"?5:4,maximum=10**digits-1
 const pattern=new RegExp(`^${prefix}-?(\\d+)$`)
 let highest=0
 for(const id of ids){const match=pattern.exec(id);if(match){const number=Number(match[1]);if(!Number.isSafeInteger(number)||number>=maximum)throw new ActorError("ID_EXHAUSTED",`La série des identifiants ${prefix} à ${digits} chiffres est épuisée.`,409);highest=Math.max(highest,number)}}
 return `${prefix}${separator}${String(highest+1).padStart(digits,"0")}`
}
export function nextAthleteId(ids:Iterable<string>){return nextActorId("athletes",ids)}
export function isActorKind(v:string):v is ActorKind{return actorKinds.includes(v as ActorKind)}
export function parseActorTable(values:unknown[][],idKey:string):ActorTable{
 const headers=(values[0]||[]).map(text),named=headers.filter(Boolean)
 if(new Set(named).size!==named.length||!headers.includes(idKey))throw new ActorError("SCHEMA","En-têtes absents ou ambigus.",503)
 const rows=values.slice(1).filter(r=>r.some(v=>text(v))).map(r=>Object.fromEntries(headers.flatMap((h,i)=>h?[[h,text(r[i])]]:[])))
 const ids=rows.map(r=>r[idKey]);if(ids.some(id=>!id)||new Set(ids).size!==ids.length)throw new ActorError("SCHEMA","Identifiants absents ou dupliqués.",503)
 return {headers,rows,values}
}
export function physicalField(headers:string[],key:string){const found=(aliases[key]||[key]).filter(h=>headers.includes(h));if(found.length>1)throw new ActorError("SCHEMA",`Colonnes ambiguës pour ${key}.`,503);return found[0]}
export function fieldsFor(headers:string[]){return actorFields.filter(f=>physicalField(headers,f.key))}
export function actorValues(row:ActorRow,headers:string[]):ActorRow{return Object.fromEntries(fieldsFor(headers).map(f=>[f.key,row[physicalField(headers,f.key)!]||""]))}
export function personSexes(options:ActorOption[]){return options.filter(o=>o.label.trim().toUpperCase()!=="MIXTE")}
export function todayKinshasa(){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Kinshasa",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const get=(t:string)=>parts.find(p=>p.type===t)!.value;return `${get("year")}-${get("month")}-${get("day")}`}
export function prepareActor(kind:ActorKind,body:unknown,table:ActorTable,refs:ActorReferences,id?:string,today=todayKinshasa()){
 if(!body||typeof body!=="object"||Array.isArray(body))throw new ActorError("VALIDATION","Requête invalide.",400)
 const input=body as Record<string,unknown>,config=actorConfig[kind],current=id?table.rows.find(r=>r[config.id]===id):undefined
 if(id&&!current)throw new ActorError("NOT_FOUND","Acteur introuvable.",404)
 const allowed=new Set(actorFields.map(f=>f.key));for(const key of Object.keys(input))if(!allowed.has(key))throw new ActorError("IMMUTABLE","Identifiant, média ou champ non modifiable.",422,{[key]:"Champ non modifiable."})
 const original=current?actorValues(current,table.headers):{},values={...original},errors:Record<string,string>={},record:ActorRow={}
 for(const [key,value]of Object.entries(input)){
  if(typeof value!=="string"){errors[key]="Une valeur texte est attendue.";continue}
  if(!physicalField(table.headers,key)){if(value.trim())errors[key]="Colonne absente de la source FECOT.";continue}
  values[key]=value.trim();if(value.length>5000)errors[key]="Champ trop long."
 }
 for(const key of ["nom_complet","id_sexe","statut"])if(!values[key])errors[key]="Champ obligatoire."
 values.statut=values.statut?.toUpperCase().replace(/^ACTIVE$/,"ACTIF").replace(/^INACTIVE$/,"INACTIF")||""
 if(values.statut&&!['ACTIF','INACTIF'].includes(values.statut))errors.statut="Statut invalide."
 if(values.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))errors.email="Adresse e-mail invalide."
 for(const f of fieldsFor(table.headers).filter(f=>f.type==="date"))if(values[f.key]){try{if(!/^(?:\d{8}|\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/.test(values[f.key]))throw Error();values[f.key]=formatDateForSheet(values[f.key])}catch{errors[f.key]="Date invalide (JJMMAAAA)."}}
 if(values.date_naissance>today)errors.date_naissance="La naissance ne peut pas être future."
 if(values.date_delivrance_passeport&&values.date_expiration_passeport&&values.date_expiration_passeport<values.date_delivrance_passeport)errors.date_expiration_passeport="L’expiration précède la délivrance."
 const validateRef=(key:string,options:ActorOption[])=>{if(values[key]&&(!current||values[key]!==original[key])&&!options.some(o=>o.id===values[key]))errors[key]="Valeur inconnue du référentiel FECOT."}
 validateRef("id_sexe",personSexes(refs.SEXES||[]));if((refs.SEXES||[]).find(o=>o.id===values.id_sexe)?.label.toUpperCase()==="MIXTE")errors.id_sexe="Mixte est réservé aux clubs."
 if(config.reference&&config.extra)validateRef(config.extra,refs[config.reference]||[])
 for(const key of ["id_national","id_wt"])if(values[key]&&table.rows.some(r=>r[config.id]!==id&&r[key]===values[key]))errors[key]="Identifiant déjà attribué dans cette catégorie."
 if(Object.keys(errors).length)throw new ActorError("VALIDATION","Corrigez les champs indiqués.",422,errors)
 for(const f of fieldsFor(table.headers))if(!current||Object.hasOwn(input,f.key))record[physicalField(table.headers,f.key)!]=values[f.key]||""
 return {values,record,current}
}
export function projectActor(kind:ActorKind,row:ActorRow,headers:string[],refs:ActorReferences={},detail=false){
 const config=actorConfig[kind],values=actorValues(row,headers),id=row[config.id],base=`/api/actors/${kind}/${encodeURIComponent(id)}/media`
 const listed=["nom_complet","id_national","id_wt","id_sexe","statut","date_naissance","nationalite",...(config.extra?[config.extra]:[]),...(kind==="autres-acteurs"?["telephone"]:[])]
 return {id,kind,values:detail?values:Object.fromEntries(listed.filter(k=>k in values).map(k=>[k,values[k]])),sexe:(refs.SEXES||[]).find(o=>o.id===values.id_sexe)?.label||values.id_sexe||"Non renseigné",extraLabel:config.reference?(refs[config.reference]||[]).find(o=>o.id===values[config.extra!])?.label||values[config.extra!]||"":"",avatarUrl:row.avatar_drive_id?`${base}/avatar`:"",passportUrl:detail&&row.passeport_drive_id?`${base}/passport`:""}
}
export type ActorRecord=ReturnType<typeof projectActor>
