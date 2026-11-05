// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { ActorError, actorConfig, actorKinds, type ActorKind, type ActorRow } from "../actors/model.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { affiliationConfig, normalized } from "../affiliations/model.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { formatDateForSheet, formatDateFromSheet } from "../compact-date.ts"
export type LicenceGroup = "athletes" | "acteurs"
export type Option = { id: string; label: string }
export type LicenceSource = { licences: ActorRow[]; actors: Record<string, ActorRow[]>; affiliations: Record<string, ActorRow[]>; structures: Record<string, ActorRow[]>; refs: Record<string, ActorRow[]> }
export const licenceSchemas = {
 athletes: ["id_licence", "id_athlete", "id_saison", "id_affiliation_athlete", "numero_licence", "date_delivrance", "id_statut_licence", "observations"],
 acteurs: ["id_licence", "id_type_acteur", "id_acteur", "id_affiliation_acteur", "id_cycle_licence", "numero_licence", "date_delivrance", "date_debut_validite", "date_fin_validite", "id_statut_licence", "observations"],
}
export const licenceSheet = (group: LicenceGroup) => group === "athletes" ? "ATHLETE_LICENCES" : "ACTEURS_LICENCES"
export function licenceDate(value: string) { if (!value) return ""; try { return formatDateFromSheet(value) } catch { return "" } }
export function effectiveStatus(label: string, start: string, end: string, today: string) {
 const status = normalized(label)
 if (!["ACTIF", "ACTIVE"].includes(status)) return ({ SUSPENDU: "SUSPENDUE", CLOTURE: "CLOTUREE", ANNULE: "ANNULEE", TERMINE: "CLOTUREE" } as Record<string, string>)[status] || status || "NON_RENSEIGNE"
 if (!start || !end || end < start) return "DATES_INVALIDES"
 return start > today ? "A_VENIR" : end < today ? "EXPIREE" : "VALIDE"
}
const options = (rows: ActorRow[] = [], id: string, label: string): Option[] => rows.filter(r => r[id]).map(r => ({ id: r[id], label: r[label] || r[id] }))
function seasonOptions(source: LicenceSource) {
 const rows=source.refs.SAISON||[],statuses=source.refs.STATUTS_SAISON||[]
 const counts=new Map<string,number>();for(const row of rows)counts.set(row.id_saison,(counts.get(row.id_saison)||0)+1)
 return rows.filter(row=>row.id_saison).map(row=>{
  const matches=statuses.filter(s=>s.id_statut_saison===row.id_statut_saison),status=matches.length===1?matches[0]:undefined
  const state=normalized(status?.nom_statut||""),start=licenceDate(row.date_debut),end=licenceDate(row.date_fin)
  const valid=counts.get(row.id_saison)===1&&!!start&&!!end&&start<=end
  const statusEnabled=["ACTIF","ACTIVE"].includes(normalized(status?.statut||""))
  return {id:row.id_saison,label:row.nom_saison||row.id_saison,start,end,state,statusEnabled,valid,issuable:valid&&statusEnabled&&["ACTIVE","PLANIFIEE"].includes(state)}
 }).sort((a,b)=>b.start.localeCompare(a.start)||a.id.localeCompare(b.id)).filter((row,index,all)=>all.findIndex(s=>s.id===row.id)===index)
}
function seasonEffective(status:string,season:ReturnType<typeof seasonOptions>[number]|undefined,start:string,end:string,today:string){
 const effective=effectiveStatus(status,start,end,today)
 if(!["ACTIF","ACTIVE"].includes(normalized(status)))return effective
 if(!season?.valid||!season.statusEnabled||!["ACTIVE","PLANIFIEE","CLOTUREE","SUSPENDUE","ANNULEE"].includes(season.state))return "SAISON_INVALIDE"
 return ["CLOTUREE","SUSPENDUE","ANNULEE"].includes(season.state)?season.state:season.state==="PLANIFIEE"&&effective==="VALIDE"?"A_VENIR":effective
}
export function licenceReferences(group: LicenceGroup, source: LicenceSource) {
 const r = source.refs, mapRows = (rows: ActorRow[] = [], key: string) => new Map(rows.map(row => [row[key], row]))
 const clubs = mapRows(source.structures.CLUBS, "id_club"), ententes = mapRows(source.structures.ENTENTES, "id_entente"), ligues = mapRows(source.structures.LIGUES, "id_ligue")
 const clubOptions = [...clubs.values()].map(c => { const e = ententes.get(c.id_entente), l = ligues.get(e?.id_ligue || ""); return { id: c.id_club, label: c.nom_club || c.id_club, ententeId: e?.id_entente || "", entente: e?.nom_entente || "", ligueId: l?.id_ligue || "", ligue: l?.nom_ligue || "" } })
 const types = options(r.TYPES_ACTEURS, "id_type_acteur", "nom_type_acteur").flatMap(option => { const row = r.TYPES_ACTEURS.find(t => t.id_type_acteur === option.id), kind = actorKinds.find(k => actorConfig[k].sheet === row?.source_donnees?.trim().toUpperCase()); return kind && kind !== "athletes" ? [{ ...option, kind }] : [] })
 const statuses = options(r.STATUT_LICENCE, "id_statut_licence", "nom_statut_licence"), statusMap = new Map(options(r.STATUTS_AFFILIATION, "id_statut_affiliation", "nom_statut_affiliation").map(o => [o.id, o.label]))
 const actors = (group === "athletes" ? [{ id: "", label: "Athlètes", kind: "athletes" as ActorKind }] : types).flatMap(type => (source.actors[actorConfig[type.kind].sheet] || []).map(row => ({ id: row[actorConfig[type.kind].id], label: row.nom_complet || row[actorConfig[type.kind].id], kind: type.kind, typeId: type.id, sexId: row.id_sexe || "" })))
 const actorsByKey = new Map(actors.map(a => [`${a.typeId}:${a.id}`, a]))
 const candidates = (group === "athletes" ? [{ id: "", kind: "athletes" as ActorKind }] : types).flatMap(type => {
  if (type.kind === "arbitres") return []
  const config = affiliationConfig[type.kind], key = actorConfig[type.kind].id
  return (source.affiliations[config.sheet] || []).flatMap(row => {
   const actor = actorsByKey.get(`${type.id}:${row[key]}`); if (!actor) return []
   const typeRow = (r.TYPES_STRUCTURES || []).find(t => t.id_type_structure === row.id_type_entite)
   const club = clubs.get(row.id_club || (normalized(typeRow?.nom_type_structure || "") === "CLUB" ? row.id_entite : ""))
   const entity = row.id_club ? club : normalized(typeRow?.nom_type_structure || "") === "CLUB" ? clubs.get(row.id_entite) : normalized(typeRow?.nom_type_structure || "") === "ENTENTE" ? ententes.get(row.id_entite) : normalized(typeRow?.nom_type_structure || "") === "LIGUE" ? ligues.get(row.id_entite) : normalized(typeRow?.nom_type_structure || "") === "FEDERATION" ? (r.FEDERATION || []).find(f => f.id_federation === row.id_entite) : undefined
   const target = entity?.nom_club || entity?.nom_entente || entity?.nom_ligue || entity?.nom_officiel || row.id_club || row.id_entite || "Non renseigné"
   return [{ id: row[config.id], actorId: actor.id, actorName: actor.label, typeId: type.id, kind: type.kind, clubId: club?.id_club || "", label: `${actor.label} — ${target}`, target, targetExists: Boolean(entity), dateDebut: licenceDate(row.date_debut), dateFin: licenceDate(row.date_fin), invalidEnd: Boolean(row.date_fin && !licenceDate(row.date_fin)), status: statusMap.get(row.id_statut_affiliation) || row.statut_affiliation || row.id_statut_affiliation || "" }]
  })
 })
 const seasons = seasonOptions(source), cycles = options(r.CYCLES_LICENCES, "id_cycle_licence", "nom_cycle_licence"), issues: string[] = []
 const activeSeasons=seasons.filter(s=>s.issuable&&s.state==="ACTIVE"),defaultSeasonId=activeSeasons.length===1?activeSeasons[0].id:""
 if (!statuses.length) issues.push("STATUT_LICENCE est vide : configurez les statuts FECOT avant de créer une licence.")
 if (group === "athletes" && !seasons.length) issues.push("SAISON est vide : configurez les saisons FECOT.")
 if (group === "athletes" && !(r.STATUTS_SAISON||[]).length) issues.push("STATUTS_SAISON est vide : configurez les statuts des saisons FECOT.")
 if (group === "acteurs" && !types.length) issues.push("TYPES_ACTEURS ne contient aucun type FECOT reconnu.")
 if (group === "acteurs" && !cycles.length) issues.push("CYCLES_LICENCES est vide : configurez les cycles FECOT.")
 return { clubs: clubOptions, seasons, defaultSeasonId, cycles, statuses, types, actors, candidates, sexes: options(r.SEXES, "id_sexe", "nom_sexe"), issues }
}
export type LicenceReferences = ReturnType<typeof licenceReferences>
export function licenceViews(group: LicenceGroup, source: LicenceSource, refs: LicenceReferences, today: string) {
 const seasonStates=new Map(refs.seasons.map(s=>[s.id,s]))
 const actors = new Map(refs.actors.map(a => [`${a.typeId}:${a.id}`, a])), candidates = new Map(refs.candidates.map(a => [`${a.typeId}:${a.id}`, a])), clubs = new Map(refs.clubs.map(c => [c.id, c]))
 const statuses = new Map(refs.statuses.map(s => [s.id, s.label])), seasons = new Map((source.refs.SAISON || []).map(s => [s.id_saison, s])), types = new Map(refs.types.map(t => [t.id, t])), cycles = new Map(refs.cycles.map(c => [c.id, c.label])), sexes = new Map(refs.sexes.map(s => [s.id, s.label]))
 return source.licences.map(row => {
  const typeId = group === "athletes" ? "" : row.id_type_acteur, actorId = group === "athletes" ? row.id_athlete : row.id_acteur, actor = actors.get(`${typeId}:${actorId}`), affiliationId = row.id_affiliation_athlete || row.id_affiliation_acteur || "", candidate = candidates.get(`${typeId}:${affiliationId}`), affiliation = candidate?.actorId === actorId ? candidate : undefined, season = seasons.get(row.id_saison), club = clubs.get(affiliation?.clubId || "")
  const start = licenceDate(group === "athletes" ? season?.date_debut || "" : row.date_debut_validite), end = licenceDate(group === "athletes" ? season?.date_fin || "" : row.date_fin_validite), status = statuses.get(row.id_statut_licence) || row.id_statut_licence || ""
  return { id: row.id_licence, version: row.__version || "", values: Object.fromEntries(licenceSchemas[group].filter(k => k !== "id_licence").map(k => [k, row[k] || ""])), actorId, actorName: actor?.label || actorId, kind: group === "athletes" ? "athletes" as ActorKind : types.get(typeId)?.kind, typeId, type: types.get(typeId)?.label || typeId, seasonId: row.id_saison || "", season: season?.nom_saison || row.id_saison || "", cycleId: row.id_cycle_licence || "", cycle: cycles.get(row.id_cycle_licence) || row.id_cycle_licence || "", number: row.numero_licence || "—", statusId: row.id_statut_licence, status, effective: group === "athletes" ? seasonEffective(statuses.get(row.id_statut_licence) || "", seasonStates.get(row.id_saison), start, end, today) : effectiveStatus(statuses.get(row.id_statut_licence) || "", start, end, today), dateDelivery: licenceDate(row.date_delivrance), start, end, remainingDays: end ? Math.round((Date.parse(end) - Date.parse(today)) / 86400000) : null, affiliationId, target: affiliation?.target || (actor?.kind === "arbitres" ? "Non applicable" : affiliationId || "Non renseigné"), clubId: club?.id || "", club: club?.label || "", ententeId: club?.ententeId || "", entente: club?.entente || "", ligueId: club?.ligueId || "", ligue: club?.ligue || "", sexId: actor?.sexId || "", sex: sexes.get(actor?.sexId || "") || "", observations: row.observations || "", anomaly: (group === "athletes" && !seasonStates.get(row.id_saison)?.valid) || !actor || (actor.kind !== "arbitres" && (!affiliation || !affiliation.targetExists)) ? "Référence historique introuvable : identifiants conservés." : "" }
 }).sort((a, b) => b.dateDelivery.localeCompare(a.dateDelivery) || a.id.localeCompare(b.id))
}
export type LicenceView = ReturnType<typeof licenceViews>[number]
export function nextLicenceId(group: LicenceGroup, year: string, rows: ActorRow[]) {
 const prefix = `FECOT-${group === "athletes" ? "LIC" : "ACL"}-${year}-`, pattern = new RegExp(`^${prefix}(\\d+)$`); let max = 0
 for (const row of rows) { const n = pattern.exec(row.id_licence); if (n) max = Math.max(max, Number(n[1])) }
 if (!Number.isSafeInteger(max) || max >= 999999) throw new ActorError("ID_EXHAUSTED", "Série des licences épuisée.", 409)
 return prefix + String(max + 1).padStart(6, "0")
}
const activeAffiliation = (a: LicenceReferences["candidates"][number], on: string) => ["ACTIF", "ACTIVE"].includes(normalized(a.status)) && a.targetExists && a.dateDebut && a.dateDebut <= on && !a.invalidEnd && (!a.dateFin || a.dateFin >= on)
export function prepareLicence(group: LicenceGroup, body: unknown, source: LicenceSource, refs: LicenceReferences, current?: ActorRow) {
 if (!body || typeof body !== "object" || Array.isArray(body)) throw new ActorError("VALIDATION", "Requête invalide.", 400)
 const input = body as Record<string, unknown>, keys = licenceSchemas[group].filter(k => k !== "id_licence"), errors: ActorRow = {}, v: ActorRow = {}
 if (Object.keys(input).some(k => ![...keys, "version", "previousId"].includes(k))) throw new ActorError("IMMUTABLE", "Champ ou identifiant non modifiable.")
 for (const k of keys) { if (typeof input[k] !== "string") errors[k] = "Valeur texte attendue."; v[k] = typeof input[k] === "string" ? input[k].trim() : ""; if (v[k].length > (k === "observations" ? 5000 : 200)) errors[k] = "Valeur trop longue." }
 const locked = group === "athletes" ? ["id_athlete", "id_saison", "id_affiliation_athlete"] : ["id_type_acteur", "id_acteur"]
 if (current && locked.some(k => v[k] !== current[k])) throw new ActorError("IMMUTABLE", "L’identité de la licence ne peut pas être modifiée.")
 for (const k of keys.filter(k => !["observations", "id_affiliation_acteur"].includes(k))) if (!v[k]) errors[k] = "Champ obligatoire."
 for (const k of group === "athletes" ? ["date_delivrance"] : ["date_delivrance", "date_debut_validite", "date_fin_validite"]) if (v[k]) { try { v[k] = formatDateForSheet(v[k]) } catch { errors[k] = "Date civile invalide." } }
 if (!refs.statuses.some(s => s.id === v.id_statut_licence)) errors.id_statut_licence = "Statut FECOT inconnu."
 const typeId = group === "athletes" ? "" : v.id_type_acteur, actorId = group === "athletes" ? v.id_athlete : v.id_acteur
 const actor = refs.actors.find(a => a.id === actorId && a.typeId === typeId)
 if (!actor) errors[group === "athletes" ? "id_athlete" : "id_acteur"] = "Acteur inconnu pour ce type."
 if (group === "athletes") { const season = refs.seasons.find(s => s.id === v.id_saison); if (!season?.valid) errors.id_saison = "Saison FECOT inconnue, ambiguë ou dates non configurées."; else if (!current && !season.issuable) errors.id_saison = "Création impossible : choisissez une saison active ou planifiée avec un statut configuré et actif." }
 else { if (!refs.cycles.some(c => c.id === v.id_cycle_licence)) errors.id_cycle_licence = "Cycle FECOT inconnu."; if (v.date_fin_validite < v.date_debut_validite || v.date_delivrance > v.date_debut_validite) errors.date_fin_validite = "La délivrance doit précéder le début, et la fin suivre le début." }
 const affiliationKey = group === "athletes" ? "id_affiliation_athlete" : "id_affiliation_acteur", affiliation = refs.candidates.find(a => a.id === v[affiliationKey] && a.actorId === actorId && a.typeId === typeId)
 if (actor?.kind === "arbitres") { if (v[affiliationKey]) errors[affiliationKey] = "Un arbitre ne doit pas être lié à une affiliation de club." }
 else if (!affiliation || !affiliation.targetExists || (group === "acteurs" && !activeAffiliation(affiliation, v.date_debut_validite))) errors[affiliationKey] = group === "athletes" ? "Affiliation au club introuvable pour cet athlète." : "Affiliation active requise au début de validité."
 if (Object.keys(errors).length) throw new ActorError("VALIDATION", "Vérifiez les champs de la licence.", 422, errors)
 const others = source.licences.filter(r => r.id_licence !== current?.id_licence)
 if (group === "athletes" && others.some(r => r.id_athlete === actorId && r.id_saison === v.id_saison)) throw new ActorError("DUPLICATE", "Cet athlète possède déjà une licence pour cette saison.", 409)
 const labels = new Map(refs.statuses.map(s => [s.id, normalized(s.label)])), cancelled = (id: string) => ["ANNULE", "ANNULEE"].includes(labels.get(id) || "")
 if (group === "acteurs" && !cancelled(v.id_statut_licence) && others.some(r => r.id_type_acteur === typeId && r.id_acteur === actorId && !cancelled(r.id_statut_licence) && (!licenceDate(r.date_debut_validite) || !licenceDate(r.date_fin_validite) || v.date_debut_validite <= licenceDate(r.date_fin_validite) && v.date_fin_validite >= licenceDate(r.date_debut_validite)))) throw new ActorError("OVERLAP", "La période chevauche une licence existante.", 409)
 return v
}
export function validateRenewalCandidate(candidate: LicenceReferences["candidates"][number], clubId: string, delivery: string) { if (candidate.clubId !== clubId || !activeAffiliation(candidate, delivery)) throw new ActorError("AFFILIATION", "Affiliation active au club requise pour le renouvellement.", 409) }
