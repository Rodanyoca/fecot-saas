import "server-only"
import {Readable} from "node:stream"
import {driveClient} from "../club-media"
import {validateLogoData} from "../club-media-validation"
import {ActorError,actorConfig,isActorKind,projectActor,type ActorKind} from "./model"
import {actorTable,actorWriteTurn,writeActorFields,invalidateActorSource,actorReferences} from "./service"
import {actorGuard,actorFailure,actorResponse} from "./api"

const MAX=5*1024*1024,options={timeout:30000,retry:false} as const
export function validateActorFile(type:string,mime:string,buffer:Buffer){
 if(buffer.byteLength===0||buffer.byteLength>MAX)throw new ActorError("FILE","Fichier vide ou supérieur à 5 Mo.")
 if(type==="avatar"){try{validateLogoData(mime,buffer.byteLength,buffer)}catch{throw new ActorError("FILE","Photo invalide : JPEG, PNG ou WebP attendu.")}}
 else if(type==="passport"){if(mime!=="application/pdf"||buffer.subarray(0,5).toString()!=="%PDF-")throw new ActorError("FILE","Document PDF invalide.")}
 else throw new ActorError("NOT_FOUND","Média inconnu.",404)
}
async function target(kind:ActorKind,id:string){const table=await actorTable(kind,true),row=table.rows.find(r=>r[actorConfig[kind].id]===id);if(!row)throw new ActorError("NOT_FOUND","Acteur introuvable.",404);return {table,row}}
export async function actorMediaGet(kindValue:string,id:string,type:string){
 try{const denied=await actorGuard();if(denied)return denied
  if(!isActorKind(kindValue)||!["avatar","passport"].includes(type))throw new ActorError("NOT_FOUND","Média inconnu.",404)
  const {row}=await target(kindValue,id),fileId=row[type==="avatar"?"avatar_drive_id":"passeport_drive_id"]
  if(!fileId)throw new ActorError("NOT_FOUND","Aucun média disponible.",404)
  const drive=driveClient(),meta=await drive.files.get({fileId,fields:"id,mimeType,size,trashed"},options)
  if(meta.data.trashed||!meta.data.size||Number(meta.data.size)>MAX)throw new ActorError("FILE","Média indisponible.",404)
  const mime=meta.data.mimeType||""
  if(type==="passport"?mime!=="application/pdf":!["image/jpeg","image/png","image/webp"].includes(mime))throw new ActorError("FILE","Type de média non autorisé.",415)
  const result=await drive.files.get({fileId,alt:"media"},{...options,responseType:"arraybuffer"}),buffer=Buffer.from(result.data as ArrayBuffer)
  validateActorFile(type,mime,buffer)
  return new Response(new Uint8Array(buffer),{headers:{"Content-Type":mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",...(type==="passport"?{"Content-Disposition":`attachment; filename="FECOT-${id.replace(/[^A-Za-z0-9._-]/g,"_")}.pdf"`}:{})}})
 }catch(error){return actorFailure(error)}
}
export async function actorMediaPut(kindValue:string,id:string,type:string,request:Request){
 if(!isActorKind(kindValue))return actorResponse({error:{message:"Catégorie inconnue."}},404)
 return actorWriteTurn(kindValue,async()=>{
  try{const denied=await actorGuard(true);if(denied)return denied
   if(!["avatar","passport"].includes(type))throw new ActorError("NOT_FOUND","Média inconnu.",404)
   const {table}=await target(kindValue,id),form=await request.formData(),file=form.get("file")
   if(!(file instanceof File)||[...form.keys()].some(k=>k!=="file"))throw new ActorError("FILE","Fichier invalide.")
   if(file.size>MAX)throw new ActorError("FILE","Fichier supérieur à 5 Mo.")
   const buffer=Buffer.from(await file.arrayBuffer());validateActorFile(type,file.type,buffer)
   const prefix=type==="avatar"?"avatar":"passeport",idKey=`${prefix}_drive_id`,urlKey=`${prefix}_drive_url`
   if(!table.headers.includes(idKey)||!table.headers.includes(urlKey))throw new ActorError("SCHEMA","Colonnes média absentes.",503)
   const folder=process.env[type==="avatar"?"FECOT_ACTOR_AVATARS_FOLDER_ID":"FECOT_ACTOR_PASSPORTS_FOLDER_ID"]?.trim(),drive=driveClient()
   if(!folder)throw new ActorError("MEDIA_CONFIG","Le dossier privé de ce média n’est pas encore configuré.",503)
   const folderInfo=await drive.files.get({fileId:folder,fields:"id,mimeType,trashed,permissions(type)"},options)
   if(folderInfo.data.trashed||folderInfo.data.mimeType!=="application/vnd.google-apps.folder"||!folderInfo.data.permissions||folderInfo.data.permissions.some(p=>p.type==="anyone"||p.type==="domain"))throw new ActorError("MEDIA_CONFIG","Le dossier de médias doit être privé et vérifiable.",503)
   const ext=type==="passport"?"pdf":file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg"
   const uploaded=await drive.files.create({requestBody:{name:`FECOT-${kindValue}-${id.replace(/[^A-Za-z0-9_-]/g,"_")}.${ext}`,parents:[folder],appProperties:{entityType:"actor",actorKind:kindValue,entityId:id}},media:{mimeType:file.type,body:Readable.from(buffer)},fields:"id"},options)
   if(!uploaded.data.id)throw new ActorError("MEDIA","Upload non confirmé.",503)
   const fileId=uploaded.data.id,record={[idKey]:fileId,[urlKey]:`/api/actors/${kindValue}/${encodeURIComponent(id)}/media/${type}`}
   try{await writeActorFields(kindValue,table,id,record)}catch(error){
    // Delete only after a definitive rejection, never after an ambiguous timeout.
    const code=(error as {code?:number})?.code
    if(code&&[400,401,403,404].includes(code))await drive.files.delete({fileId},options).catch(()=>undefined)
    invalidateActorSource();throw new ActorError("WRITE_UNCERTAIN","Média envoyé mais liaison non confirmée. Rechargez la fiche avant de réessayer.",503)
   }
   invalidateActorSource();const confirmed=await target(kindValue,id).catch(()=>{throw new ActorError("WRITE_UNCERTAIN","La liaison du média ne peut pas être confirmée. Rechargez la fiche avant de réessayer.",503)})
   if(confirmed.row[idKey]!==fileId)throw new ActorError("WRITE_UNCERTAIN","La liaison du média ne peut pas être confirmée.",503)
   return actorResponse({actor:projectActor(kindValue,confirmed.row,confirmed.table.headers,await actorReferences(kindValue).catch(()=>({})),true)})
  }catch(error){return actorFailure(error)}
 })
}
