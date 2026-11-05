import "server-only"
import {actorGuard,actorResponse} from "../actors/api"
import {ActorError} from "../actors/model"
import {isSection,type Section} from "./model"
import {competitionSource,competitionDataset} from "./service"
import {saveCompetitionCommand} from "./mutation"
import {competitionWriteTurn} from "./store"
function competitionFailure(error:unknown){
 const failure=error instanceof ActorError?error:new ActorError("SOURCE_UNAVAILABLE","Service Compétitions temporairement indisponible.",503)
 if(failure.status>=500)console.error(`[competitions] ${failure.code}`)
 return actorResponse({error:{code:failure.code,message:failure.message,fields:failure.fields,uncertain:failure.code==="WRITE_UNCERTAIN"}},failure.status)
}
export async function competitionsGet(request:Request,competitionId?:string,sectionValue="general"){
 try{
  const denied=await actorGuard();if(denied)return denied
  if(!isSection(sectionValue))throw new ActorError("NOT_FOUND","Section inconnue.",404)
  if(competitionId&&competitionId.length>300)throw new ActorError("VALIDATION","Identifiant invalide.")
  const query=new URL(request.url).searchParams,options={fresh:query.get("fresh")==="1",options:query.get("options")==="1",typeId:query.get("typeId")||undefined}
  if(!competitionId&&(sectionValue!=="general"||options.options))throw new ActorError("VALIDATION","Compétition parente obligatoire.")
  const source=await competitionSource(sectionValue,competitionId,options),dataset=competitionDataset(source,sectionValue,competitionId,options)
  return actorResponse(options.options?{references:dataset.references,issues:dataset.issues}:dataset)
 }catch(error){return competitionFailure(error)}
}
export async function competitionsWrite(request:Request,competitionId?:string,sectionValue="general"){
 return competitionWriteTurn(async()=>{
  try{
   const denied=await actorGuard(true);if(denied)return denied
   if(!isSection(sectionValue))throw new ActorError("NOT_FOUND","Section inconnue.",404)
   if(!["POST","PUT"].includes(request.method))throw new ActorError("METHOD","Méthode non autorisée.",405)
   const query=new URL(request.url).searchParams,id=sectionValue==="general"&&request.method==="PUT"?competitionId:query.get("recordId")||undefined
   if(request.method==="PUT"&&!id||request.method==="POST"&&id)throw new ActorError("VALIDATION","Identifiant de modification invalide.")
   if(competitionId&&competitionId.length>300)throw new ActorError("VALIDATION","Identifiant parent invalide.")
   const text=await request.text();if(text.length>65536)throw new ActorError("VALIDATION","Requête trop volumineuse.",413)
   let body:unknown;try{body=JSON.parse(text)}catch{throw new ActorError("VALIDATION","JSON invalide.",400)}
   return actorResponse(await saveCompetitionCommand(sectionValue as Section,competitionId,body,id),request.method==="POST"?201:200)
  }catch(error){return competitionFailure(error)}
 })
}
