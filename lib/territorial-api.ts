import "server-only"
import { randomUUID } from "node:crypto"
import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { getNavigationAccess, getSession } from "./auth"
import { readTables, writeRecord } from "./territorial-store"
import { prepareRecord } from "./territorial-domain"
import { EntenteKeyMigrationRequired } from "./entente-id"
import { withEntenteWriteLock } from "./entente-write-queue"
import { getTerritorialData, TERRITORIAL_CACHE_TAG } from "./territorial-data"
import type { Sheet } from "./territorial-schema"
import { invalidateActorTerritorySource } from "./actors/service"

const paths = { LIGUES: "ligues", ENTENTES: "ententes", CLUBS: "clubs" } as const
export async function requireTerritorialWrite() {
  const session = await getSession()
  if (!session || session.doitChangerMotDePasse) return NextResponse.json({ message: "Connexion requise." }, { status: 401 })
  const access = await getNavigationAccess(session)
  if (!access["AUT-SPT:WRITE"]) return NextResponse.json({ message: "Modification non autorisée." }, { status: 403 })
  return null
}
export function invalidateTerritory() {
  invalidateActorTerritorySource()
  revalidateTag(TERRITORIAL_CACHE_TAG, { expire: 0 })
  for (const path of ["/ligues", "/ententes", "/clubs", "/dashboard"]) revalidatePath(path)
}
export async function readTerritory(sheet: Sheet) {
  try {
    const data = await getTerritorialData()
    return NextResponse.json({ [paths[sheet]]: data[paths[sheet]], configured: true }, { headers: { "Cache-Control": "private, no-store" } })
  } catch { return NextResponse.json({ message: "Référentiel territorial indisponible." }, { status: 503 }) }
}
export async function mutateTerritory(sheet: Sheet, request: Request, id?: string) {
  return sheet === "ENTENTES" ? withEntenteWriteLock(() => mutateTerritoryRecord(sheet, request, id)) : mutateTerritoryRecord(sheet, request, id)
}
async function mutateTerritoryRecord(sheet: Sheet, request: Request, id?: string) {
  try {
    const denied = await requireTerritorialWrite()
    if (denied) return denied
    let payload: unknown
    try { payload = await request.json() } catch { return NextResponse.json({ message: "Requête invalide." }, { status: 400 }) }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return NextResponse.json({ message: "Requête invalide." }, { status: 400 })
    const { tables, refs } = await readTables()
    const newId = sheet === "ENTENTES" ? "" : `FECOT-${sheet === "LIGUES" ? "LIG" : "CLB"}-${randomUUID()}`
    const prepared = prepareRecord(sheet, payload as Record<string, unknown>, tables, refs, id, newId)
    await writeRecord(sheet, tables[sheet], prepared.id, prepared.record, Boolean(id))
    invalidateTerritory()
    const data = await getTerritorialData()
    const plural = paths[sheet], singular = plural.slice(0, -1)
    const key = sheet === "LIGUES" ? "idLigue" : sheet === "ENTENTES" ? "idEntente" : "idClub"
    const saved = (data[plural] as unknown as Record<string, unknown>[]).find(row => row[key] === prepared.id)
    if (!saved) throw new Error("L’écriture n’a pas pu être confirmée.")
    return NextResponse.json({ [singular]: saved, message: "Structure enregistrée." }, { status: id ? 200 : 201 })
  } catch (error) {
    if (error instanceof EntenteKeyMigrationRequired) return NextResponse.json({ message: error.message, code: "ENTENTE_KEY_MIGRATION_REQUIRED" }, { status: 409 })
    const message = error instanceof Error ? error.message : "Enregistrement impossible."
    const validation = /obligatoire|invalide|introuvable|déjà|précède|incompatible|technique|longueur|Code|ne correspond/i.test(message)
    console.error("[territoire]", validation ? "VALIDATION" : "SOURCE_UNAVAILABLE")
    return NextResponse.json({ message: validation ? message : "Le service territorial est indisponible. Vérifiez la configuration et les accès Google." }, { status: validation ? 422 : 503 })
  }
}
