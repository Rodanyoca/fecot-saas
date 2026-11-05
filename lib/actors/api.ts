import "server-only"
import {NextResponse} from "next/server"
import {getSession,getNavigationAccess} from "../auth"
import {ActorError,isActorKind,type ActorKind} from "./model"
import {actorDetail,actorReferences,actorRelations,actorTable,actorWriteTurn,listActors,saveActor} from "./service"
import {fieldsFor,personSexes} from "./model"

export async function actorGuard(write=false){
 const session=await getSession();if(!session||session.doitChangerMotDePasse)return NextResponse.json({error:{message:"Connexion requise."}},{status:401})
 const access=await getNavigationAccess(session);if(!access[`AUT-SPT:${write?"WRITE":"READ"}`])return NextResponse.json({error:{message:"Accès non autorisé."}},{status:403})
 return null
}
export function actorResponse(data:unknown,status=200){return NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}})}
export function actorFailure(error:unknown){
 if(error instanceof ActorError)return actorResponse({error:{code:error.code,message:error.message,fields:error.fields,uncertain:error.code==="WRITE_UNCERTAIN"}},error.status)
 console.error("[actors] SOURCE_UNAVAILABLE")
 return actorResponse({error:{code:"SOURCE_UNAVAILABLE",message:"Source FECOT temporairement indisponible."}},503)
}
export async function actorsGet(kindValue:string,request:Request,id?:string){
 try{
  const denied=await actorGuard();if(denied)return denied
  if(!isActorKind(kindValue))throw new ActorError("NOT_FOUND","Catégorie inconnue.",404)
  const section=new URL(request.url).searchParams.get("section")
  if(id&&section){if(section!=="affiliations"&&section!=="licences")throw new ActorError("VALIDATION","Section inconnue.");return actorResponse({sections:await actorRelations(kindValue,id,section)})}
  if(id)return actorResponse(await actorDetail(kindValue,id))
  if(new URL(request.url).searchParams.get("references")==="1"){
   const [table,refs]=await Promise.all([actorTable(kindValue),actorReferences(kindValue,true)]);return actorResponse({fields:fieldsFor(table.headers),references:{...refs,SEXES:personSexes(refs.SEXES||[])}})
  }
  return actorResponse(await listActors(kindValue))
 }catch(error){return actorFailure(error)}
}
export async function actorsWrite(kindValue:string,request:Request,id?:string){
 if(!isActorKind(kindValue))return actorResponse({error:{message:"Catégorie inconnue."}},404)
 const kind:ActorKind=kindValue
 return actorWriteTurn(kind,async()=>{
  try{const denied=await actorGuard(true);if(denied)return denied
   let body:unknown;try{body=await request.json()}catch{throw new ActorError("VALIDATION","Requête JSON invalide.",400)}
   return actorResponse({actor:await saveActor(kind,body,id)},id?200:201)
  }catch(error){return actorFailure(error)}
 })
}
