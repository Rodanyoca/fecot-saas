import "server-only"
import {ActorError} from "../actors/model"
import {byId,isEntity,scopeRows,sections,type Section} from "./model"
import {competitionSource} from "./service"
import {planMutation} from "./planner"
import {persistCompetitionWrites,recordVersion} from "./store"
export async function saveCompetitionCommand(section:Section,competitionId:string|undefined,body:unknown,editingId?:string){
 if(!body||typeof body!=="object"||Array.isArray(body))throw new ActorError("VALIDATION","Requête invalide.",400)
 const input=body as Record<string,unknown>
 if(Object.keys(input).some(k=>!["entity","values","version","reviewRankings"].includes(k)))throw new ActorError("IMMUTABLE","Champ de commande inconnu.")
 if(typeof input.entity!=="string"||!isEntity(input.entity)||!(sections[section]as readonly string[]).includes(input.entity))throw new ActorError("VALIDATION","Commande étrangère à cette section.")
 if(input.reviewRankings!==undefined&&typeof input.reviewRankings!=="boolean")throw new ActorError("VALIDATION","Confirmation de révision invalide.")
 const entity=input.entity,values=input.values&&typeof input.values==="object"&&!Array.isArray(input.values)?input.values as Record<string,unknown>:{}
 if(entity==="unite"||entity==="groupeUnite")throw new ActorError("READ_ONLY","Cette relation n’est pas une destination d’écriture directe.",405)
 if(!competitionId&&entity!=="competition")throw new ActorError("VALIDATION","Compétition parente obligatoire.")
 if(editingId&&editingId.length>300)throw new ActorError("VALIDATION","Identifiant invalide.")
 const raw=await competitionSource(section,competitionId,{fresh:true,write:entity,typeId:typeof values.id_type_acteur==="string"?values.id_type_acteur:undefined})
 const scoped=competitionId?scopeRows(raw,competitionId):raw,current=editingId?byId(scoped,entity,editingId):undefined
 if(editingId&&!current)throw new ActorError("NOT_FOUND","Enregistrement introuvable dans cette compétition.",404)
 if(current&&input.version!==recordVersion(current))throw new ActorError("CONFLICT","Cet enregistrement a changé. Actualisez avant de le modifier.",409)
 const plan=planMutation(raw,entity,competitionId,input.values,editingId,input.reviewRankings===true)
 return persistCompetitionWrites(raw.tables,plan.writes)
}
