// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { affiliationsFixture } from "./affiliations-fixture.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { licenceSchemas, licenceSheet, type LicenceGroup } from "../lib/licences/model.ts"
export async function licencesFixture() {
 const f = await affiliationsFixture(), books = f.state.books
 books.STRUCTURE = { CLUBS: [["id_club", "nom_club", "id_entente"], ["C001", "Club Test Alpha", "0101"], ["C002", "Club Test Beta", "0201"]], ENTENTES: [["id_entente", "nom_entente", "id_ligue"], ["0101", "Entente Test A", "01"], ["0201", "Entente Test B", "02"]], LIGUES: [["id_ligue", "nom_ligue"], ["01", "Ligue Test A"], ["02", "Ligue Test B"]] }
 books.REFS.SAISON = [["id_saison", "nom_saison", "date_debut", "date_fin", "id_statut_saison"], ["S26", "2026", "2026-01-01", "2026-12-31", "TEST-SACTIVE"], ["S27", "2027", "2027-01-01", "2027-12-31", "TEST-SPLAN"]]
 books.REFS.STATUTS_SAISON = [["id_statut_saison", "nom_statut", "description", "statut"], ["TEST-SACTIVE", "ACTIVE", "", "ACTIF"], ["TEST-SPLAN", "PLANIFIEE", "", "ACTIF"], ["TEST-SCLOSED", "CLOTUREE", "", "ACTIF"], ["TEST-SSUSP", "SUSPENDUE", "", "ACTIF"], ["TEST-SCANCEL", "ANNULEE", "", "ACTIF"]]
 books.REFS.STATUT_LICENCE = [["id_statut_licence", "nom_statut_licence"], ["TEST-LACT", "ACTIVE"], ["TEST-LEXP", "EXPIREE"], ["TEST-LSUS", "SUSPENDUE"], ["TEST-LCLO", "CLOTUREE"], ["TEST-LANN", "ANNULEE"]]
 books.REFS.CYCLES_LICENCES = [["id_cycle_licence", "nom_cycle_licence"], ["TEST-CYC", "SPORTIF"]]
 books.REFS.TYPES_ACTEURS = [["id_type_acteur", "nom_type_acteur", "source_donnees"], ["TEST-COA", "Entraîneur", "COACHS"], ["TEST-OFF", "Officiel", "OFFICIELS"], ["TEST-ARB", "Arbitre", "ARBITRES"], ["TEST-MED", "Médecin", "MEDECINS"], ["TEST-AUT", "Autre acteur", "AUTRES"]]
 for (const group of ["athletes", "acteurs"] as const) books.LIC[licenceSheet(group)] = [[...licenceSchemas[group], "colonne_historique"]]
 const read = (group: LicenceGroup = "athletes", query = "") => f.api.licencesGet(group, new Request(`http://offline.invalid/api/licences/${group}${query}`))
 const write = (body: unknown, group: LicenceGroup = "athletes", method = "POST", query = "") => f.api.licencesWrite(group, new Request(`http://offline.invalid/api/licences/${group}${query}`, { method, body: JSON.stringify(body) }))
 const athleteInput = { id_athlete: "ATH00001", id_saison: "S26", id_affiliation_athlete: "AFA-000001", numero_licence: "N-001", date_delivrance: "01/01/2026", id_statut_licence: "TEST-LACT", observations: "" }
 const actorInput = { id_type_acteur: "TEST-ARB", id_acteur: "ARB0001", id_affiliation_acteur: "", id_cycle_licence: "TEST-CYC", numero_licence: "ARB-N-001", date_delivrance: "01/01/2026", date_debut_validite: "01/01/2026", date_fin_validite: "31/12/2099", id_statut_licence: "TEST-LACT", observations: "" }
 const seedAthlete = async () => { await f.write(); const response = await f.writeAffiliation(f.affiliationInput); if (!response.ok) throw Error(JSON.stringify(await response.json())) }
 return { ...f, readLicences: read, writeLicence: write, athleteInput, actorInput, seedAthlete }
}
