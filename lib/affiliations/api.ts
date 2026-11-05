import "server-only"
import { actorFailure, actorGuard, actorResponse } from "../actors/api"
import { actorWriteTurn } from "../actors/service"
import { affiliationLicenceWriteTurn } from "../licences/write-queue"
import { ActorError } from "../actors/model"
import { isAffiliationKind } from "./model"
import { affiliationEditorData, getAffiliationOptions, listAffiliations, saveAffiliation } from "./service"
export async function affiliationsGet(kind: string, actorId: string, request: Request) {
 try {
  const denied = await actorGuard(); if (denied) return denied
  if (!isAffiliationKind(kind)) throw new ActorError("NOT_FOUND", "Catégorie d’affiliation inconnue.", 404)
  const query = new URL(request.url).searchParams
  if (query.get("editor") === "1") return actorResponse(await affiliationEditorData(kind, actorId, query.get("fresh") === "1"))
  return actorResponse(query.get("options") === "1" ? { options: await getAffiliationOptions(kind, actorId) } : { affiliations: await listAffiliations(kind, actorId, query.get("fresh") === "1") })
 } catch (error) { return actorFailure(error) }
}
export async function affiliationsWrite(kind: string, actorId: string, request: Request, id?: string) {
 if (!isAffiliationKind(kind)) return actorResponse({ error: { message: "Catégorie d’affiliation inconnue." } }, 404)
 return affiliationLicenceWriteTurn(() => actorWriteTurn(kind, async () => {
  try {
   const denied = await actorGuard(true); if (denied) return denied
   let body: unknown; try { body = await request.json() } catch { throw new ActorError("VALIDATION", "Requête JSON invalide.", 400) }
   return actorResponse({ affiliation: await saveAffiliation(kind, actorId, body, id) }, id ? 200 : 201)
  } catch (error) { return actorFailure(error) }
 }))
}
