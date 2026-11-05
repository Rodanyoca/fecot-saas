import "server-only"
import {createHash} from "node:crypto"
import type {sheets_v4} from "googleapis"
import {sheetsClient} from "../territorial-store"
import {ActorError,parseActorTable,text,type ActorRow} from "../actors/model"
import {schema,sheets,refSchema,idField,type Entity,type Reference,type Issue,type Table,type Row} from "./model"
import {competitionSourceError} from "./source-error"
const opts={timeout:15000,retry:false} as const
type Values=unknown[][]
const cache=new Map<string,{until:number;values:Values}>(),pending=new Map<string,Promise<Values>>(),generations=new Map<string,number>()
const getId=(variable:string)=>{const id=process.env[variable]?.trim();if(!id)throw new ActorError("CONFIG",`Configuration manquante : ${variable}.`,503);return id}
export const recordVersion=(row:Row)=>createHash("sha256").update(JSON.stringify(Object.entries(row).sort(([a],[b])=>a.localeCompare(b)))).digest("hex")
export function invalidateCompetitionSource(){
 const id=process.env.FECOT_COMPETITIONS_SPREADSHEET_ID?.trim();if(!id)return
 generations.set(id,(generations.get(id)||0)+1)
 for(const key of new Set([...cache.keys(),...pending.keys()]))if(JSON.parse(key)[0]===id){cache.delete(key);pending.delete(key)}
}
// Cache individual raw sheets, batch compatible misses, share overlapping in-flight reads.
// No permissions or user-specific projections are cached. Fresh command reads bypass both.
export async function readCompetitionSheets(variable:string,names:string[],fresh=false,ttl=30000):Promise<Record<string,Values>>{
 const id=getId(variable),unique=[...new Set(names)],now=Date.now(),generation=generations.get(id)||0
 const result:Record<string,Promise<Values>>={},missing:string[]=[]
 for(const name of unique){const key=JSON.stringify([id,name]),hit=cache.get(key),flight=pending.get(key);if(!fresh&&hit&&hit.until>now)result[name]=Promise.resolve(hit.values);else if(!fresh&&flight)result[name]=flight;else missing.push(name)}
 if(missing.length){
  const batch=sheetsClient().spreadsheets.values.batchGet({spreadsheetId:id,ranges:missing.map(name=>`'${name}'!A:AF`)},opts).catch(error=>{throw competitionSourceError(error,variable)})
  for(const [index,name]of missing.entries()){
   const key=JSON.stringify([id,name])
   const request=batch.then(response=>{const values=response.data.valueRanges?.[index]?.values||[];if(!fresh&&(generations.get(id)||0)===generation){cache.set(key,{values,until:Date.now()+ttl});while(cache.size>256)cache.delete(cache.keys().next().value!)}return values})
   result[name]=request
   if(!fresh){pending.set(key,request);void request.then(()=>{if(pending.get(key)===request)pending.delete(key)},()=>{if(pending.get(key)===request)pending.delete(key)})}
  }
 }
 return Object.fromEntries(await Promise.all(unique.map(async name=>[name,await result[name]])))
}
export async function entityTables(entities:Entity[],fresh=false):Promise<Partial<Record<Entity,Table>>>{
 const values=await readCompetitionSheets("FECOT_COMPETITIONS_SPREADSHEET_ID",entities.map(e=>sheets[e]),fresh)
 return Object.fromEntries(entities.map(entity=>{const table=parseActorTable(values[sheets[entity]],idField(entity));const missing=schema[entity].filter(h=>!table.headers.includes(h));if(missing.length)throw new ActorError("SCHEMA",`${sheets[entity]} : colonnes manquantes (${missing.join(", ")}).`,503);return [entity,table]}))
}
export async function referenceTables(names:Reference[],fresh=false):Promise<{refs:Partial<Record<Reference,Row[]>>;issues:Issue[]}>{
 const data=await readCompetitionSheets("FECOT_REFERENTIELS_SPREADSHEET_ID",names,fresh,300000),issues:Issue[]=[]
 const refs=Object.fromEntries(names.map(name=>{
  const headers=(data[name]?.[0]||[]).map(text),spec=refSchema[name],missing=spec.filter(h=>!headers.includes(h))
  if(missing.length||new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length){issues.push({source:name,message:`${name} : schéma incomplet ou ambigu.`,blocking:true});return [name,[]]}
  const raw=data[name].slice(1).filter(r=>r.some(v=>text(v))).map(r=>Object.fromEntries(headers.flatMap((h,i)=>h?[[h,text(r[i])]]:[]))),id=spec[0],label=spec[1]
  const valid=raw.filter(r=>r[id]&&r[label]),ids=valid.map(r=>r[id])
  if(new Set(ids).size!==ids.length){issues.push({source:name,message:`${name} : identifiants dupliqués, référence inutilisable.`,blocking:true});return [name,[]]}
  if(valid.length!==raw.length)issues.push({source:name,message:`${name} : ${raw.length-valid.length} ligne(s) sans identifiant ou libellé ; configuration à corriger.`,blocking:true})
  if(!valid.length)issues.push({source:name,message:`${name} ne contient aucune valeur exploitable.`,blocking:true})
  return [name,valid]
 }))
 return {refs,issues}
}
export type Write={entity:Entity;record:ActorRow;editing?:string}
const metadata=new Map<string,{until:number;ids:Map<string,number>}>(),metadataPending=new Map<string,Promise<Map<string,number>>>()
const metadataGenerations=new Map<string,number>()
async function sheetIds(id:string,fresh=false){
 const hit=metadata.get(id);if(!fresh&&hit&&hit.until>Date.now())return hit.ids
 const flight=metadataPending.get(id);if(!fresh&&flight)return flight
 if(fresh)metadataGenerations.set(id,(metadataGenerations.get(id)||0)+1)
 const generation=metadataGenerations.get(id)||0
 const request=sheetsClient().spreadsheets.get({spreadsheetId:id,fields:"sheets(properties(sheetId,title))"},opts).then(response=>{const ids=new Map<string,number>();for(const sheet of response.data.sheets||[])if(sheet.properties?.title&&sheet.properties.sheetId!=null)ids.set(sheet.properties.title,sheet.properties.sheetId);if((metadataGenerations.get(id)||0)===generation)metadata.set(id,{ids,until:Date.now()+300000});return ids}).catch(error=>{throw competitionSourceError(error,"FECOT_COMPETITIONS_SPREADSHEET_ID")})
 if(!fresh)metadataPending.set(id,request);try{return await request}finally{if(metadataPending.get(id)===request)metadataPending.delete(id)}
}
export async function competitionSheetNames(fresh=false){return [...(await sheetIds(getId("FECOT_COMPETITIONS_SPREADSHEET_ID"),fresh)).keys()]}
let tail:Promise<void>=Promise.resolve()
export function competitionWriteTurn<T>(work:()=>Promise<T>){const task=tail.then(work);tail=task.then(()=>undefined,()=>undefined);return task}
export async function persistCompetitionWrites(tables:Partial<Record<Entity,Table>>,writes:Write[]){
 const spreadsheetId=getId("FECOT_COMPETITIONS_SPREADSHEET_ID"),ids=await sheetIds(spreadsheetId),requests:sheets_v4.Schema$Request[]=[]
 for(const write of writes){
  const table=tables[write.entity];if(!table)throw new ActorError("SCHEMA",`Source ${sheets[write.entity]} indisponible.`,503)
  const sheetId=ids.get(sheets[write.entity]);if(sheetId==null)throw new ActorError("SCHEMA",`Feuille ${sheets[write.entity]} absente.`,503)
  if(Object.keys(write.record).some(h=>!table.headers.includes(h)))throw new ActorError("SCHEMA","Une colonne de destination manque.",503)
  if(write.editing){
   const index=table.headers.indexOf(idField(write.entity)),physical=table.values.flatMap((row,i)=>i>0&&text(row[index])===write.editing?[i+1]:[])
   if(physical.length!==1)throw new ActorError("CONFLICT","Ligne absente ou ambiguë. Actualisez.",409)
   for(const [field,value]of Object.entries(write.record))if(field!==idField(write.entity)){const column=table.headers.indexOf(field);requests.push({updateCells:{range:{sheetId,startRowIndex:physical[0]-1,endRowIndex:physical[0],startColumnIndex:column,endColumnIndex:column+1},rows:[{values:[{userEnteredValue:{stringValue:value}}]}],fields:"userEnteredValue"}})}
  }else{
   requests.push({appendCells:{sheetId,rows:[{values:table.headers.map(h=>({userEnteredValue:{stringValue:write.record[h]||""}}))}],fields:"userEnteredValue"}})
  }
 }
 try{
  await sheetsClient().spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests}},opts)
  invalidateCompetitionSource()
  const confirmed=await entityTables([...new Set(writes.map(w=>w.entity))],true)
  for(const write of writes){const row=confirmed[write.entity]?.rows.find(r=>r[idField(write.entity)]===write.record[idField(write.entity)]);if(!row||Object.entries(write.record).some(([key,value])=>row[key]!==value))throw Error("Read-back mismatch")}
  return {confirmed:writes.map(w=>({entity:w.entity,id:w.record[idField(w.entity)]}))}
 }catch{
  metadata.delete(spreadsheetId)
  invalidateCompetitionSource()
  throw new ActorError("WRITE_UNCERTAIN","Écriture non confirmée. Actualisez avant toute nouvelle tentative pour éviter les doublons.",503)
 }
}
