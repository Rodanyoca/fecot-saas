import "server-only"
import { createHash } from "node:crypto"
import { actorConfig, ActorError, type ActorRow } from "../actors/model"
import { actorTable, invalidateActorSource, readActorSheets } from "../actors/service"
import { sheetsClient, required } from "../territorial-store"
import { columnLetter } from "../territorial-schema"
import { formatDateFromSheet } from "../compact-date"
import { affiliationConfig, checkAffiliationOverlap, nextAffiliationId, normalized, prepareAffiliation, verifyAffiliationSchema, type AffiliationKind, type AffiliationOption, type AffiliationOptions } from "./model"
const opts = { timeout: 15000, retry: false } as const
const optionRows = (rows: ActorRow[], id: string, label: string): AffiliationOption[] => rows.map(row => ({ id: row[id], label: row[label] || row[id] }))
const version = (row: ActorRow) => createHash("sha256").update(JSON.stringify(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))).digest("hex")
const entitySource: Record<string, { sheet: string; id: string; label: string; reference?: boolean }> = {
 CLUB: { sheet: "CLUBS", id: "id_club", label: "nom_club" }, ENTENTE: { sheet: "ENTENTES", id: "id_entente", label: "nom_entente" }, LIGUE: { sheet: "LIGUES", id: "id_ligue", label: "nom_ligue" }, FEDERATION: { sheet: "FEDERATION", id: "id_federation", label: "nom_officiel", reference: true },
}
export async function affiliationOptions(kind: AffiliationKind, fresh = false): Promise<AffiliationOptions> {
 const clubKind = affiliationConfig[kind].fields.includes("id_club")
 const refNames = ["STATUTS_AFFILIATION", ...(!clubKind ? ["TYPES_STRUCTURES", "FEDERATION"] : []), ...(kind === "officiels" ? ["FONCTION_OFFICIEL"] : []), ...(kind === "autres-acteurs" ? ["SAISON"] : [])]
 const [refs, territory] = await Promise.all([readActorSheets("FECOT_REFERENTIELS_SPREADSHEET_ID", refNames, fresh, 300000), readActorSheets("FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID", clubKind ? ["CLUBS"] : ["CLUBS", "ENTENTES", "LIGUES"], fresh)])
 const expected: Record<string, string[]> = { STATUTS_AFFILIATION: ["id_statut_affiliation", "nom_statut_affiliation"], TYPES_STRUCTURES: ["id_type_structure", "nom_type_structure"], FEDERATION: ["id_federation", "nom_officiel"], FONCTION_OFFICIEL: ["id_fonction", "nom_fonction"], SAISON: ["id_saison", "nom_saison"], CLUBS: ["id_club", "nom_club"], ENTENTES: ["id_entente", "nom_entente"], LIGUES: ["id_ligue", "nom_ligue"] }
 for (const [name, table] of Object.entries({ ...refs, ...territory })) if (expected[name].some(key => !table.headers.includes(key))) throw new ActorError("SCHEMA", `Référentiel ${name} incomplet.`, 503)
 const statuses = optionRows(refs.STATUTS_AFFILIATION.rows, "id_statut_affiliation", "nom_statut_affiliation")
 const types = refs.TYPES_STRUCTURES?.rows || []
 const entities: Record<string, AffiliationOption[]> = Object.create(null)
 for (const row of types) { const source = entitySource[normalized(row.nom_type_structure || "")]; if (source) entities[row.id_type_structure] = optionRows((source.reference ? refs : territory)[source.sheet].rows, source.id, source.label) }
 const result: AffiliationOptions = { clubs: optionRows(territory.CLUBS.rows, "id_club", "nom_club"), statuses: kind === "autres-acteurs" ? statuses.map(s => ({ id: s.label, label: s.label })) : statuses, functions: optionRows(refs.FONCTION_OFFICIEL?.rows || [], "id_fonction", "nom_fonction"), entityTypes: optionRows(types.filter(row => Object.hasOwn(entities, row.id_type_structure)), "id_type_structure", "nom_type_structure"), entities, seasons: optionRows(refs.SAISON?.rows || [], "id_saison", "nom_saison"), issues: [] }
 if (!result.statuses.length) result.issues.push("Le référentiel STATUTS_AFFILIATION est vide.")
 if (clubKind && !result.clubs.length) result.issues.push("Aucun club FECOT n’est disponible.")
 if (!clubKind && !result.entityTypes.length) result.issues.push("Les types de structures FECOT ne permettent pas de résoudre une entité.")
 if (kind === "officiels" && !result.functions.length) result.issues.push("Le référentiel FONCTION_OFFICIEL est vide.")
 if (kind === "autres-acteurs" && !result.seasons.length) result.issues.push("Le référentiel SAISON est vide.")
 if (kind === "autres-acteurs" && new Set(result.statuses.map(s => s.id)).size !== result.statuses.length) throw new ActorError("SCHEMA", "Libellés des statuts ambigus pour AUTRES_AFFILIATIONS.", 503)
 return result
}
async function source(kind: AffiliationKind, actorId: string, fresh = false) {
 const actor = await actorTable(kind, true), actorKey = actorConfig[kind].id
 if (!actor.rows.some(row => row[actorKey] === actorId)) throw new ActorError("NOT_FOUND", "Acteur introuvable.", 404)
 const c = affiliationConfig[kind], table = (await readActorSheets("FECOT_AFFILIATIONS_SPREADSHEET_ID", [c.sheet], fresh))[c.sheet]
 verifyAffiliationSchema(kind, table, actorKey)
 return { table, actorKey, config: c }
}
function indexes(refs: AffiliationOptions) {
 const map = (options: AffiliationOption[]) => new Map(options.map(option => [option.id, option.label]))
 return { clubs: map(refs.clubs), statuses: map(refs.statuses), functions: map(refs.functions), seasons: map(refs.seasons), types: map(refs.entityTypes), entities: new Map(Object.entries(refs.entities).map(([key, options]) => [key, map(options)])) }
}
function project(kind: AffiliationKind, row: ActorRow, refs: AffiliationOptions, index = indexes(refs)) {
 const c = affiliationConfig[kind], values = Object.fromEntries(c.fields.map(key => { let value = row[key] || ""; if (key.startsWith("date_") && value) { try { value = formatDateFromSheet(value) } catch { /* Preserve invalid history for consultation. */ } } return [key, value] }))
 const target = values.id_club ? index.clubs.get(values.id_club) : index.entities.get(values.id_type_entite)?.get(values.id_entite)
 const statusId = values.id_statut_affiliation || values.statut_affiliation
 return { id: row[c.id], version: version(row), values, target: target || values.id_club || values.id_entite || "Non renseigné", typeLabel: index.types.get(values.id_type_entite) || values.id_type_entite || "", status: index.statuses.get(statusId) || statusId, functionLabel: index.functions.get(values.id_fonction) || values.id_fonction || "", season: index.seasons.get(values.id_saison) || values.id_saison || "", anomaly: !target ? "Entité introuvable dans le référentiel actuel." : "" }
}
async function affiliationData(kind: AffiliationKind, actorId: string, fresh: boolean, editor: boolean) {
 const { table, actorKey } = await source(kind, actorId, fresh)
 const rows = table.rows.filter(row => row[actorKey] === actorId)
 if (!rows.length && !editor) return { affiliations: [], options: null }
 const refs = await affiliationOptions(kind, fresh)
 const index = indexes(refs)
 return { affiliations: rows.map(row => project(kind, row, refs, index)).sort((a, b) => b.values.date_debut.localeCompare(a.values.date_debut) || a.id.localeCompare(b.id)), options: refs }
}
export async function listAffiliations(kind: AffiliationKind, actorId: string, fresh = false) {
 return (await affiliationData(kind, actorId, fresh, false)).affiliations
}
export async function affiliationEditorData(kind: AffiliationKind, actorId: string, fresh = false) {
 return affiliationData(kind, actorId, fresh, true)
}
export async function getAffiliationOptions(kind: AffiliationKind, actorId: string) {
 await source(kind, actorId)
 return affiliationOptions(kind)
}
export async function saveAffiliation(kind: AffiliationKind, actorId: string, body: unknown, id?: string) {
 const { table, actorKey, config: c } = await source(kind, actorId, true)
 const current = id ? table.rows.find(row => row[c.id] === id && row[actorKey] === actorId) : undefined
 if (id && !current) throw new ActorError("NOT_FOUND", "Affiliation introuvable pour cet acteur.", 404)
 if (current && (!body || typeof body !== "object" || (body as Record<string, unknown>).version !== version(current))) throw new ActorError("CONFLICT", "L’affiliation a changé. Rechargez son historique avant de modifier.", 409)
 const refs = await affiliationOptions(kind, true), values = prepareAffiliation(kind, body, refs)
 if (current && ["id_club", "id_type_entite", "id_entite"].some(key => values[key] !== undefined && values[key] !== current[key])) {
  const sheet = kind === "athletes" ? "ATHLETE_LICENCES" : "ACTEURS_LICENCES", key = kind === "athletes" ? "id_affiliation_athlete" : "id_affiliation_acteur", actorField = kind === "athletes" ? "id_athlete" : "id_acteur"
  const licences = (await readActorSheets("FECOT_LICENCES_SPREADSHEET_ID", [sheet], true))[sheet]
  if (![key, actorField].every(field => licences.headers.includes(field))) throw new ActorError("SCHEMA", "Impossible de vérifier les licences liées avant le changement de structure.", 503)
  if (licences.rows.some(row => row[key] === id && row[actorField] === actorId)) throw new ActorError("REFERENCE_IN_USE", "Cette affiliation est liée à une licence. Clôturez-la puis créez une nouvelle affiliation pour changer de structure.", 409)
 }
 const duplicate = !id && table.rows.find(row => row[actorKey] === actorId && c.fields.every(key => row[key] === values[key]))
 if (duplicate) return project(kind, duplicate, refs)
 checkAffiliationOverlap(kind, table.rows, values, actorKey, actorId, id)
 const savedId = id || nextAffiliationId(kind, table.rows), record = { [c.id]: savedId, [actorKey]: actorId, ...values }
 const client = sheetsClient(), spreadsheetId = required("FECOT_AFFILIATIONS_SPREADSHEET_ID")
 try {
  if (!id) await client.spreadsheets.values.append({ spreadsheetId, range: `'${c.sheet}'!A:AF`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: [table.headers.map(h => record[h] || "")] } }, opts)
  else {
   const index = table.headers.indexOf(c.id), physical = table.values.flatMap((r, i) => i > 0 && String(r[index] || "").trim() === id ? [i + 1] : [])
   if (physical.length !== 1) throw Error("Ambiguous row")
   await client.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: Object.entries(values).map(([key, value]) => ({ range: `'${c.sheet}'!${columnLetter(table.headers.indexOf(key))}${physical[0]}`, values: [[value]] })) } }, opts)
  }
 } catch { invalidateActorSource(); throw new ActorError("WRITE_UNCERTAIN", `Écriture non confirmée (${savedId}). Rechargez l’historique avant toute nouvelle tentative.`, 503) }
 invalidateActorSource()
 const confirmed = await readActorSheets("FECOT_AFFILIATIONS_SPREADSHEET_ID", [c.sheet], true).catch(() => null)
 const row = confirmed?.[c.sheet].rows.find(row => row[c.id] === savedId)
 if (!row || Object.entries(record).some(([key, value]) => row[key] !== value)) throw new ActorError("WRITE_UNCERTAIN", `Confirmation indisponible (${savedId}). Rechargez l’historique avant toute nouvelle tentative.`, 503)
 return project(kind, row, refs)
}
