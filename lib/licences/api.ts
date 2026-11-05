import "server-only"
import { actorGuard, actorResponse, actorFailure } from "../actors/api"
import { ActorError, isActorKind } from "../actors/model"
import { licencePageData, licenceWriteTurn, saveLicence, renewClub, transitionLicence } from "./service"
const isGroup = (value: string): value is "athletes" | "acteurs" => value === "athletes" || value === "acteurs"
export async function licencesGet(group: string, request: Request) {
 try {
  const denied = await actorGuard(); if (denied) return denied
  if (!isGroup(group)) throw new ActorError("NOT_FOUND", "Parcours inconnu.", 404)
  const query = new URL(request.url).searchParams, kind = query.get("kind"), actorId = query.get("actorId")
  if (kind || actorId) {
   if (!kind || !actorId || !isActorKind(kind) || (group === "athletes") !== (kind === "athletes")) throw new ActorError("VALIDATION", "Acteur ou catégorie invalide.")
   return actorResponse(await licencePageData(group, query.get("fresh") === "1", { kind, actorId }))
  }
  return actorResponse(await licencePageData(group, query.get("fresh") === "1"))
 } catch (error) { return actorFailure(error) }
}
export async function licencesWrite(group: string, request: Request) {
 return licenceWriteTurn(async () => {
  try {
   const denied = await actorGuard(true); if (denied) return denied
   if (!isGroup(group)) throw new ActorError("NOT_FOUND", "Parcours inconnu.", 404)
   let body: unknown; try { body = await request.json() } catch { throw new ActorError("VALIDATION", "JSON invalide.", 400) }
   const query = new URL(request.url).searchParams, id = query.get("id")
   if (request.method === "PATCH") { if (group !== "acteurs") throw new ActorError("VALIDATION", "Transition indisponible."); return actorResponse({ confirmed: await transitionLicence(body) }) }
   if (query.get("mode") === "club") { if (group !== "athletes" || request.method !== "POST") throw new ActorError("VALIDATION", "Renouvellement invalide."); return actorResponse({ confirmed: await renewClub(body) }, 201) }
   if (request.method === "PUT" && !id || request.method === "POST" && id) throw new ActorError("VALIDATION", "Identifiant de licence invalide.")
   return actorResponse({ confirmed: await saveLicence(group, body, request.method === "PUT" ? id! : undefined) }, request.method === "POST" ? 201 : 200)
  } catch (error) { return actorFailure(error) }
 })
}
