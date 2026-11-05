import "server-only"
import { createHash } from "node:crypto"
import { actorConfig, actorKinds, ActorError, todayKinshasa, type ActorKind, type ActorRow, type ActorTable } from "../actors/model"
import { readActorSheets, invalidateActorSource } from "../actors/service"
import { affiliationConfig, normalized, verifyAffiliationSchema } from "../affiliations/model"
import { required, sheetsClient } from "../territorial-store"
import { columnLetter } from "../territorial-schema"
export { affiliationLicenceWriteTurn as licenceWriteTurn } from "./write-queue"
import { licenceSchemas, licenceSheet, licenceReferences, licenceViews, licenceDate, nextLicenceId, prepareLicence, validateRenewalCandidate, type LicenceGroup, type LicenceSource } from "./model"
const opts = { timeout: 15000, retry: false } as const
const version = (row: ActorRow) => createHash("sha256").update(JSON.stringify(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))).digest("hex")
const rowTables = (tables: Record<string, ActorTable>) => Object.fromEntries(Object.entries(tables).map(([k, t]) => [k, t.rows]))
function schema(table: ActorTable, fields: string[]) { if (fields.some(k => !table.headers.includes(k))) throw new ActorError("SCHEMA", "Schéma des licences ou référentiels FECOT incomplet.", 503) }
async function load(group: LicenceGroup, fresh = false, history?: { kind: ActorKind; actorId: string }) {
 const kinds = history ? [history.kind] : group === "athletes" ? ["athletes" as const] : actorKinds.filter(k => k !== "athletes")
 const sheets = kinds.map(k => actorConfig[k].sheet), affKinds = kinds.filter(k => k !== "arbitres"), affSheets = affKinds.map(k => affiliationConfig[k].sheet)
 const needsStructures = !history || history.kind !== "arbitres"
 for (const name of ["FECOT_LICENCES_SPREADSHEET_ID", "FECOT_ACTEURS_SPREADSHEET_ID", "FECOT_REFERENTIELS_SPREADSHEET_ID", ...(affSheets.length ? ["FECOT_AFFILIATIONS_SPREADSHEET_ID"] : []), ...(needsStructures ? ["FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID"] : [])]) if (!process.env[name]?.trim()) throw new ActorError("CONFIG", `Configuration manquante : ${name}.`, 503)
 const refNames = group === "athletes" ? ["SAISON", "STATUTS_SAISON", "STATUT_LICENCE", "STATUTS_AFFILIATION", "SEXES"] : ["TYPES_ACTEURS", "CYCLES_LICENCES", "STATUT_LICENCE", ...(needsStructures ? ["STATUTS_AFFILIATION"] : []), ...(!history || ["officiels", "autres-acteurs"].includes(history.kind) ? ["TYPES_STRUCTURES", "FEDERATION"] : [])]
 const [licences, actors, affiliations, structures, refs] = await Promise.all([
  readActorSheets("FECOT_LICENCES_SPREADSHEET_ID", [licenceSheet(group)], fresh), readActorSheets("FECOT_ACTEURS_SPREADSHEET_ID", sheets, fresh || Boolean(history)), affSheets.length ? readActorSheets("FECOT_AFFILIATIONS_SPREADSHEET_ID", affSheets, fresh) : Promise.resolve({} as Record<string, ActorTable>), needsStructures ? readActorSheets("FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID", ["CLUBS", "ENTENTES", "LIGUES"], fresh) : Promise.resolve({} as Record<string, ActorTable>), readActorSheets("FECOT_REFERENTIELS_SPREADSHEET_ID", refNames, fresh, 300000),
 ])
 const table = licences[licenceSheet(group)]; schema(table, licenceSchemas[group])
 for (const kind of kinds) schema(actors[actorConfig[kind].sheet], [actorConfig[kind].id, "nom_complet"])
 for (const kind of affKinds) verifyAffiliationSchema(kind, affiliations[affiliationConfig[kind].sheet], actorConfig[kind].id)
 const refFields: Record<string, string[]> = { SAISON: ["id_saison", "nom_saison", "date_debut", "date_fin"], STATUT_LICENCE: ["id_statut_licence", "nom_statut_licence"], STATUTS_AFFILIATION: ["id_statut_affiliation", "nom_statut_affiliation"], SEXES: ["id_sexe", "nom_sexe"], TYPES_ACTEURS: ["id_type_acteur", "nom_type_acteur", "source_donnees"], CYCLES_LICENCES: ["id_cycle_licence", "nom_cycle_licence"], TYPES_STRUCTURES: ["id_type_structure", "nom_type_structure"], FEDERATION: ["id_federation", "nom_officiel"] }
 refFields.SAISON.push("id_statut_saison")
 refFields.STATUTS_SAISON=["id_statut_saison","nom_statut","statut"]
 for (const name of refNames) schema(refs[name], refFields[name])
 if (needsStructures) for (const [name, fields] of Object.entries({ CLUBS: ["id_club", "nom_club", "id_entente"], ENTENTES: ["id_entente", "nom_entente", "id_ligue"], LIGUES: ["id_ligue", "nom_ligue"] })) schema(structures[name], fields)
 let rows = table.rows
 if (history) {
  if (!actors[actorConfig[history.kind].sheet].rows.some(r => r[actorConfig[history.kind].id] === history.actorId)) throw new ActorError("NOT_FOUND", "Acteur introuvable.", 404)
  const typeIds = refs.TYPES_ACTEURS?.rows.filter(t => t.source_donnees?.trim().toUpperCase() === actorConfig[history.kind].sheet).map(t => t.id_type_acteur) || []
  if (group === "acteurs" && !typeIds.length) throw new ActorError("REFERENCE", "Le type d’acteur n’est pas configuré dans TYPES_ACTEURS.", 503)
  rows = rows.filter(r => group === "athletes" ? r.id_athlete === history.actorId : r.id_acteur === history.actorId && typeIds.includes(r.id_type_acteur))
 }
 const actorRows = rowTables(actors), affRows = rowTables(affiliations), structureRows = rowTables(structures), refRows = rowTables(refs)
 if (history) {
  actorRows[actorConfig[history.kind].sheet] = actorRows[actorConfig[history.kind].sheet].filter(r => r[actorConfig[history.kind].id] === history.actorId)
  const used = new Set(rows.map(r => r.id_affiliation_athlete || r.id_affiliation_acteur))
  for (const kind of affKinds) affRows[affiliationConfig[kind].sheet] = affRows[affiliationConfig[kind].sheet].filter(r => r[actorConfig[kind].id] === history.actorId && used.has(r[affiliationConfig[kind].id]))
  const linked = Object.values(affRows).flat(), types = new Map((refRows.TYPES_STRUCTURES || []).map(r => [r.id_type_structure, normalized(r.nom_type_structure)]))
  const clubs = new Set(linked.map(r => r.id_club || (types.get(r.id_type_entite) === "CLUB" ? r.id_entite : "")))
  structureRows.CLUBS = (structureRows.CLUBS || []).filter(r => clubs.has(r.id_club))
  const ententes = new Set([...structureRows.CLUBS.map(r => r.id_entente), ...linked.filter(r => types.get(r.id_type_entite) === "ENTENTE").map(r => r.id_entite)])
  structureRows.ENTENTES = (structureRows.ENTENTES || []).filter(r => ententes.has(r.id_entente))
  const ligues = new Set([...structureRows.ENTENTES.map(r => r.id_ligue), ...linked.filter(r => types.get(r.id_type_entite) === "LIGUE").map(r => r.id_entite)])
  structureRows.LIGUES = (structureRows.LIGUES || []).filter(r => ligues.has(r.id_ligue))
  if (refRows.FEDERATION) { const federations = new Set(linked.filter(r => types.get(r.id_type_entite) === "FEDERATION").map(r => r.id_entite)); refRows.FEDERATION = refRows.FEDERATION.filter(r => federations.has(r.id_federation)) }
 }
 const data: LicenceSource = { licences: rows.map(r => ({ ...r, __version: version(r) })), actors: actorRows, affiliations: affRows, structures: structureRows, refs: refRows }
 return { data, table }
}
export async function licencePageData(group: LicenceGroup, fresh = false, history?: { kind: ActorKind; actorId: string }) {
 const { data } = await load(group, fresh, history), references = licenceReferences(group, data)
 return { rows: licenceViews(group, data, references, todayKinshasa()), ...(history ? {} : { references }) }
}
async function persist(group: LicenceGroup, table: ActorTable, records: ActorRow[], editing?: string) {
 const spreadsheetId = required("FECOT_LICENCES_SPREADSHEET_ID"), sheet = licenceSheet(group), client = sheetsClient()
 try {
  if (!editing) await client.spreadsheets.values.append({ spreadsheetId, range: `'${sheet}'!A:AF`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: records.map(r => table.headers.map(h => r[h] || "")) } }, opts)
  else {
   const index = table.headers.indexOf("id_licence"), physical = table.values.flatMap((r, i) => i > 0 && String(r[index] || "").trim() === editing ? [i + 1] : [])
   if (physical.length !== 1) throw Error("Ambiguous row")
   const data = Object.entries(records[0]).filter(([key]) => key !== "id_licence").map(([key, value]) => ({ range: `'${sheet}'!${columnLetter(table.headers.indexOf(key))}${physical[0]}`, values: [[value]] }))
   await client.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data } }, opts)
  }
 } catch { invalidateActorSource(); throw new ActorError("WRITE_UNCERTAIN", "Écriture de licence non confirmée. Actualisez avant toute nouvelle tentative.", 503) }
 invalidateActorSource()
 const confirmed = await readActorSheets("FECOT_LICENCES_SPREADSHEET_ID", [sheet], true).catch(() => null)
 if (!confirmed || records.some(record => !confirmed[sheet].rows.some(row => Object.entries(record).every(([key, value]) => row[key] === value)))) throw new ActorError("WRITE_UNCERTAIN", "Licence écrite mais confirmation indisponible. Actualisez avant toute nouvelle tentative.", 503)
 return records
}
export async function saveLicence(group: LicenceGroup, body: unknown, id?: string) {
 const { data, table } = await load(group, true), refs = licenceReferences(group, data), current = id ? table.rows.find(r => r.id_licence === id) : undefined
 if (id && !current) throw new ActorError("NOT_FOUND", "Licence introuvable.", 404)
 const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {}
 if (current && input.version !== version(current)) throw new ActorError("CONFLICT", "La licence a changé. Actualisez avant de modifier.", 409)
 if (input.previousId) {
  const previous = table.rows.find(r => r.id_licence === input.previousId)
  const start = licenceDate(String(input.date_debut_validite || ""))
  if (id || group !== "acteurs" || !previous || previous.id_type_acteur !== input.id_type_acteur || previous.id_acteur !== input.id_acteur || !licenceDate(previous.date_fin_validite) || !start || start <= licenceDate(previous.date_fin_validite)) throw new ActorError("RENEWAL", "La nouvelle période doit suivre la licence précédente du même acteur.", 409)
 }
 const values = prepareLicence(group, body, data, refs, current), savedId = id || nextLicenceId(group, values.date_delivrance.slice(0, 4), table.rows)
 return persist(group, table, [{ id_licence: savedId, ...values }], id)
}
export async function renewClub(body: unknown) {
 if (!body || typeof body !== "object" || Array.isArray(body)) throw new ActorError("VALIDATION", "Requête invalide.", 400)
 const v = body as Record<string, unknown>, allowed = ["id_club", "id_saison", "id_affiliations_athletes", "date_delivrance", "id_statut_licence", "observations"]
 if (Object.keys(v).some(k => !allowed.includes(k)) || !Array.isArray(v.id_affiliations_athletes) || !v.id_affiliations_athletes.length || v.id_affiliations_athletes.length > 200 || v.id_affiliations_athletes.some(id => typeof id !== "string")) throw new ActorError("VALIDATION", "Sélectionnez de 1 à 200 affiliations valides.")
 const { data, table } = await load("athletes", true), refs = licenceReferences("athletes", data), staged: ActorRow[] = [], actors = new Set<string>(), delivery = licenceDate(String(v.date_delivrance || ""))
 if (!delivery) throw new ActorError("VALIDATION", "Date de délivrance invalide.")
 for (const id of v.id_affiliations_athletes) {
  const candidate = refs.candidates.find(c => c.id === id); if (!candidate) throw new ActorError("REFERENCE", "Affiliation introuvable.")
  validateRenewalCandidate(candidate, String(v.id_club || ""), delivery)
  if (actors.has(candidate.actorId)) throw new ActorError("DUPLICATE", "Un athlète ne peut être sélectionné qu’une fois.", 409)
  actors.add(candidate.actorId)
  const previous = table.rows.filter(r => r.id_athlete === candidate.actorId && r.id_saison !== v.id_saison && licenceDate(r.date_delivrance) <= delivery && r.numero_licence).sort((a, b) => licenceDate(b.date_delivrance).localeCompare(licenceDate(a.date_delivrance)))[0]
  if (!previous) throw new ActorError("FIRST_LICENCE", "Enregistrez la première licence individuellement.", 409)
  const values = prepareLicence("athletes", { id_athlete: candidate.actorId, id_saison: v.id_saison, id_affiliation_athlete: id, numero_licence: previous.numero_licence, date_delivrance: delivery, id_statut_licence: v.id_statut_licence, observations: v.observations || "" }, { ...data, licences: [...data.licences, ...staged] }, refs)
  staged.push({ id_licence: nextLicenceId("athletes", delivery.slice(0, 4), [...table.rows, ...staged]), ...values })
 }
 return persist("athletes", table, staged)
}
export async function transitionLicence(body: unknown) {
 if (!body || typeof body !== "object" || Array.isArray(body)) throw new ActorError("VALIDATION", "Requête invalide.", 400)
 const v = body as Record<string, unknown>
 if (Object.keys(v).some(k => !["id", "version", "action"].includes(k))) throw new ActorError("VALIDATION", "Requête invalide.")
 const { data, table } = await load("acteurs", true), refs = licenceReferences("acteurs", data), row = table.rows.find(r => r.id_licence === v.id)
 if (!row) throw new ActorError("NOT_FOUND", "Licence introuvable.", 404)
 if (v.version !== version(row)) throw new ActorError("CONFLICT", "La licence a changé. Actualisez.", 409)
 const status = normalized(refs.statuses.find(s => s.id === row.id_statut_licence)?.label || ""), action = String(v.action), active = ["ACTIF", "ACTIVE"].includes(status), suspended = ["SUSPENDU", "SUSPENDUE"].includes(status), cancelled = ["ANNULE", "ANNULEE"].includes(status)
 const permitted = action === "cancel" ? !cancelled : action === "reactivate" ? suspended : action === "suspend" ? active : action === "close" && (active || suspended)
 if (!permitted || (action !== "cancel" && (!licenceDate(row.date_fin_validite) || licenceDate(row.date_fin_validite) < todayKinshasa()))) throw new ActorError("TRANSITION", "Transition interdite pour cette licence.", 409)
 const labels: Record<string, string[]> = { suspend: ["SUSPENDU", "SUSPENDUE"], reactivate: ["ACTIF", "ACTIVE"], close: ["CLOTURE", "CLOTUREE"], cancel: ["ANNULE", "ANNULEE"] }, target = refs.statuses.filter(s => labels[action]?.includes(normalized(s.label)))
 if (target.length !== 1) throw new ActorError("REFERENCE", "Le statut cible FECOT est absent ou ambigu.", 503)
 const values = Object.fromEntries(licenceSchemas.acteurs.filter(k => k !== "id_licence").map(k => [k, row[k] || ""]))
 values.id_statut_licence = target[0].id
 for (const key of ["date_delivrance", "date_debut_validite", "date_fin_validite"]) { const value = licenceDate(values[key]); if (!value) throw new ActorError("VALIDATION", "Dates historiques invalides : corrigez la licence avant cette action."); values[key] = value }
 if (action === "reactivate") prepareLicence("acteurs", values, data, refs, row)
 return persist("acteurs", table, [{ id_licence: row.id_licence, ...values }], row.id_licence)
}
