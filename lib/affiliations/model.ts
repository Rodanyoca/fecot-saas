// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { ActorError, type ActorKind, type ActorRow, type ActorTable } from "../actors/model.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { formatDateForSheet, formatDateFromSheet } from "../compact-date.ts"

export type AffiliationKind = Exclude<ActorKind, "arbitres">
const common = ["date_debut", "date_fin", "id_statut_affiliation", "observations"]
export const affiliationConfig: Record<AffiliationKind, { sheet: string; id: string; prefix: string; fields: string[] }> = {
 athletes: { sheet: "ATHLETE_AFFILIATIONS", id: "id_affiliation_athlete", prefix: "AFA", fields: ["id_club", ...common] },
 coachs: { sheet: "COACH_AFFILIATIONS", id: "id_affiliation_coach", prefix: "AFC", fields: ["id_club", ...common] },
 medecins: { sheet: "MEDECIN_AFFILIATIONS", id: "id_affiliation_medecin", prefix: "AFM", fields: ["id_club", ...common] },
 officiels: { sheet: "OFFICIELS_AFFILIATIONS", id: "id_affiliation_officiel", prefix: "AFO", fields: ["id_fonction", "id_type_entite", "id_entite", ...common] },
 "autres-acteurs": { sheet: "AUTRES_AFFILIATIONS", id: "id_affiliation", prefix: "AFAUT", fields: ["id_saison", "id_type_entite", "id_entite", "date_debut", "date_fin", "statut_affiliation", "observations"] },
}
export type AffiliationOption = { id: string; label: string }
export type AffiliationOptions = { clubs: AffiliationOption[]; statuses: AffiliationOption[]; functions: AffiliationOption[]; entityTypes: AffiliationOption[]; entities: Record<string, AffiliationOption[]>; seasons: AffiliationOption[]; issues: string[] }
export type AffiliationItem = { id: string; version: string; values: ActorRow; target: string; typeLabel: string; status: string; functionLabel: string; season: string; anomaly: string }
export function isAffiliationKind(kind: string): kind is AffiliationKind { return Object.hasOwn(affiliationConfig, kind) }
export const normalized = (value: string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
export function verifyAffiliationSchema(kind: AffiliationKind, table: ActorTable, actorKey: string) {
 const c = affiliationConfig[kind]
 if ([c.id, actorKey, ...c.fields].some(key => !table.headers.includes(key))) throw new ActorError("SCHEMA", "Schéma des affiliations FECOT incomplet.", 503)
}
export function nextAffiliationId(kind: AffiliationKind, rows: ActorRow[]) {
 const c = affiliationConfig[kind], pattern = new RegExp(`^${c.prefix}-(\\d+)$`)
 let maximum = 0
 for (const row of rows) { const match = pattern.exec(row[c.id]); if (match) maximum = Math.max(maximum, Number(match[1])) }
 if (!Number.isSafeInteger(maximum) || maximum >= 999999) throw new ActorError("ID_EXHAUSTED", "Série des affiliations épuisée.", 409)
 return `${c.prefix}-${String(maximum + 1).padStart(6, "0")}`
}
export function prepareAffiliation(kind: AffiliationKind, body: unknown, refs: AffiliationOptions) {
 if (!body || typeof body !== "object" || Array.isArray(body)) throw new ActorError("VALIDATION", "Requête invalide.", 400)
 const c = affiliationConfig[kind], input = body as Record<string, unknown>, errors: ActorRow = {}, values: ActorRow = {}
 if (Object.keys(input).some(key => ![...c.fields, "version"].includes(key))) throw new ActorError("IMMUTABLE", "Identifiant, acteur ou champ non modifiable.")
 for (const field of c.fields) {
  if (typeof input[field] !== "string") errors[field] = "Une valeur texte est attendue."
  values[field] = typeof input[field] === "string" ? input[field].trim() : ""
  if (values[field].length > (field === "observations" ? 5000 : 200)) errors[field] = "Valeur trop longue."
 }
 for (const field of c.fields.filter(key => !["date_fin", "observations"].includes(key))) if (!values[field]) errors[field] = "Ce champ est obligatoire."
 for (const field of ["date_debut", "date_fin"]) if (values[field]) { try { values[field] = formatDateForSheet(values[field]) } catch { errors[field] = "Date invalide." } }
 if (!errors.date_debut && !errors.date_fin && values.date_fin && values.date_fin < values.date_debut) errors.date_fin = "La fin précède le début."
 const requireOption = (field: string, options: AffiliationOption[]) => { if (!options.some(option => option.id === values[field])) errors[field] = "Sélection inconnue ou référentiel non configuré." }
 if (c.fields.includes("id_club")) requireOption("id_club", refs.clubs)
 else { requireOption("id_type_entite", refs.entityTypes); requireOption("id_entite", refs.entities[values.id_type_entite] || []) }
 if (kind === "officiels") requireOption("id_fonction", refs.functions)
 if (kind === "autres-acteurs") requireOption("id_saison", refs.seasons)
 const statusKey = kind === "autres-acteurs" ? "statut_affiliation" : "id_statut_affiliation"
 requireOption(statusKey, refs.statuses)
 const status = refs.statuses.find(option => option.id === values[statusKey])
 if (status && ["TERMINE", "TERMINEE"].includes(normalized(status.label)) && !values.date_fin) errors.date_fin = "La date de fin est obligatoire pour une affiliation terminée."
 if (Object.keys(errors).length) throw new ActorError("VALIDATION", "Vérifiez les champs de l’affiliation.", 422, errors)
 return values
}
export function checkAffiliationOverlap(kind: AffiliationKind, rows: ActorRow[], values: ActorRow, actorKey: string, actorId: string, editingId?: string) {
 const c = affiliationConfig[kind]
 for (const row of rows) {
  if (row[actorKey] !== actorId || row[c.id] === editingId) continue
  const sameTarget = c.fields.includes("id_club") ? row.id_club === values.id_club : row.id_type_entite === values.id_type_entite && row.id_entite === values.id_entite && (kind !== "autres-acteurs" || row.id_saison === values.id_saison)
  if (kind !== "athletes" && !sameTarget) continue
  let start: string, end: string
  try { start = formatDateFromSheet(row.date_debut); end = row.date_fin ? formatDateFromSheet(row.date_fin) : "9999-12-31"; if (!start || end < start) throw Error() } catch { throw new ActorError("HISTORY_INVALID", "Une période historique invalide doit être corrigée avant cet ajout.", 409) }
  if (start <= (values.date_fin || "9999-12-31") && values.date_debut <= end) throw new ActorError("OVERLAP", kind === "athletes" ? "L’athlète possède déjà une affiliation sur cette période. Clôturez son ancienne affiliation avant un changement de club." : "Cette période chevauche une affiliation existante à la même entité.", 409, { date_debut: "Période en conflit.", date_fin: "Période en conflit." })
 }
}
