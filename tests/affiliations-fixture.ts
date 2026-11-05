// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { actorsFixture } from "./actors-fixture.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { affiliationConfig, type AffiliationKind } from "../lib/affiliations/model.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { actorConfig } from "../lib/actors/model.ts"
export async function affiliationsFixture() {
 const f = await actorsFixture(), { books, env } = f.state
 Object.assign(env, { FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID: "STRUCTURE" })
 books.STRUCTURE = { CLUBS: [["id_club", "nom_club"], ["C001", "Club Test Alpha"], ["C002", "Club Test Beta"]], LIGUES: [["id_ligue", "nom_ligue"], ["01", "Ligue Test"]], ENTENTES: [["id_entente", "nom_entente"], ["0101", "Entente Test"]] }
 Object.assign(books.REFS, { STATUTS_AFFILIATION: [["id_statut_affiliation", "nom_statut_affiliation"], ["TEST-ACT", "Active"], ["TEST-END", "Terminée"]], FONCTION_OFFICIEL: [["id_fonction", "nom_fonction"], ["TEST-FON", "Fonction Test"]], TYPES_STRUCTURES: [["id_type_structure", "nom_type_structure"], ["TEST-CLUB", "CLUB"], ["TEST-LIG", "LIGUE"]], FEDERATION: [["id_federation", "nom_officiel"]], SAISON: [["id_saison", "nom_saison"], ["TEST-SAI", "Saison Test"]] })
 for (const [kind, c] of Object.entries(affiliationConfig)) books.AFF[c.sheet] = [[c.id, actorConfig[kind as AffiliationKind].id, ...c.fields, "historique_non_modifiable"]]
 const read = (kind = "athletes", actorId = "ATH00001", options = false) => f.api.affiliationsGet(kind, actorId, new Request(`http://offline.invalid/api/affiliations/${kind}/${actorId}${options ? "?options=1" : ""}`))
 const write = (body: unknown, kind = "athletes", actorId = "ATH00001", id?: string) => f.api.affiliationsWrite(kind, actorId, new Request("http://offline.invalid/affiliations", { method: id ? "PUT" : "POST", body: JSON.stringify(body) }), id)
 const input = { id_club: "C001", date_debut: "2026-01-01", date_fin: "", id_statut_affiliation: "TEST-ACT", observations: "Synthetic observation" }
 return { ...f, readAffiliations: read, writeAffiliation: write, affiliationInput: input }
}
