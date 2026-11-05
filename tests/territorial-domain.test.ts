import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { prepareRecord } from "../lib/territorial-domain.ts"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { mapTable, schema, columnLetter } from "../lib/territorial-schema.ts"
import type { Row } from "../lib/territorial-schema.ts"

const table = (headers: readonly string[], rows: Row[] = []) => mapTable([[...headers], ...rows.map(row => headers.map(key => row[key] || ""))], headers)
const source = () => ({
  tables: { LIGUES: table(schema.LIGUES, [{ id_ligue: "01", id_province: "PRO01", nom_ligue: "Ligue FECOT", statut: "" }, { id_ligue: "02", id_province: "PRO02", nom_ligue: "Autre ligue" }]), ENTENTES: table(schema.ENTENTES, [{ id_entente: "ENT-existante", id_ligue: "01", id_ville: "VILLE-1", code_entente: "01", nom_entente: "Entente existante" }]), CLUBS: table(schema.CLUBS) },
  refs: { PROVINCES: table(["id_province", "nom_province"], [{ id_province: "PRO01", nom_province: "Kinshasa" }, { id_province: "PRO02", nom_province: "Kwango" }]), VILLES: table(["id_ville", "id_province", "nom_ville"], [{ id_ville: "VILLE-1", id_province: "PRO01", nom_ville: "Kinshasa" }, { id_ville: "VILLE-2", id_province: "PRO02", nom_ville: "Kenge" }]), CATEGORIES_CLUB: table(["id_categorie_club", "nom_categorie_club"], [{ id_categorie_club: "CAT-1", nom_categorie_club: "Amateur" }]), SEXES: table(["id_sexe", "nom_sexe"], [{ id_sexe: "SEX-1", nom_sexe: "Mixte" }]) },
})
const input = () => ({ codeClub: "0007", nomClub: "Club FECOT", idEntente: "ENT-existante", idVille: "VILLE-1", idCategorieClub: "CAT-1", idSexe: "SEX-1", telephone: "+243 00123", email: "club@example.test", statut: "ACTIF", dateCreation: "01012025", dateAffiliationClub: "02012025" })

test("header mapping survives reordering and blank columns, preserves leading zeros", () => {
  const result = mapTable([["nom_ligue", "", "id_ligue", "id_province"], ["Kinshasa", "", "01", "PRO01"]], ["id_ligue", "id_province", "nom_ligue"])
  assert.equal(result.rows[0].id_ligue, "01")
  assert.throws(() => mapTable([["id_ligue", "id_ligue"]], ["id_ligue"]))
  assert.equal(columnLetter(26), "AA")
})
test("club creation persists reference IDs, telephone text and canonical dates", () => {
  const { tables, refs } = source()
  const saved = prepareRecord("CLUBS", input(), tables, refs, undefined, "FECOT-CLB-new")
  assert.equal(saved.id, "FECOT-CLB-new")
  assert.equal(saved.record.code_club, "0007")
  assert.equal(saved.record.telephone, "+243 00123")
  assert.equal(saved.record.date_affiliation, "2025-01-02")
  assert.equal(saved.record.id_categorie_club, "CAT-1")
  assert.equal(saved.record.id_ligue_historique, undefined)
  assert.equal(saved.record.id_ligue, undefined)
})
test("club update preserves technical ID, historic league and logo columns", () => {
  const { tables, refs } = source()
  tables.CLUBS = table(schema.CLUBS, [{ id_club: "EXISTANT", code_club: "0007", id_entente: "ENT-existante", nom_club: "Club", id_ligue_historique: "26", logo_drive_id: "old-file" }])
  const saved = prepareRecord("CLUBS", input(), tables, refs, "EXISTANT", "unused")
  assert.equal(saved.id, "EXISTANT")
  for (const key of ["id_club", "id_ligue_historique", "logo_drive_id", "logo_drive_url"]) assert.equal(saved.record[key], undefined)
})
test("rejects invalid dates, chronology, unknown refs, wrong province and duplicate code", () => {
  const { tables, refs } = source()
  for (const payload of [{ dateCreation: "31022025" }, { dateCreation: "junk01012025" }, { dateCreation: "03012025" }, { idVille: "VILLE-2" }, { idCategorieClub: "UNKNOWN" }, { idEntente: "UNKNOWN" }, { statut: "UNKNOWN" }, { id_club: "HACK" }]) assert.throws(() => prepareRecord("CLUBS", { ...input(), ...payload }, tables, refs, undefined, "new"))
  tables.CLUBS = table(schema.CLUBS, [{ id_club: "old", id_entente: "ENT-existante", code_club: "0007", nom_club: "Other" }])
  assert.throws(() => prepareRecord("CLUBS", input(), tables, refs, undefined, "new"))
})
test("creates an entente under a real league and rejects a reparent that invalidates its city", () => {
  const { tables, refs } = source()
  const payload = { codeEntente: "02", nomEntente: "Entente", idLigue: "01", idVille: "VILLE-1", statut: "ACTIF" }
  assert.equal(prepareRecord("ENTENTES", payload, tables, refs, undefined, "FECOT-ENT-new").record.id_ligue, "01")
  assert.throws(() => prepareRecord("ENTENTES", { ...payload, idLigue: "02" }, tables, refs, "ENT-existante", "unused"))
})
test("edits an existing numeric league ID without regeneration or defaulted affiliation date", () => {
  const { tables, refs } = source()
  const result = prepareRecord("LIGUES", { nomLigue: "Ligue FECOT", idProvince: "PRO01", statut: "ACTIF" }, tables, refs, "01", "unused")
  assert.equal(result.id, "01")
  assert.equal(result.record.id_ligue, undefined)
  assert.equal(result.record.date_affiliation_ligue, "")
  assert.throws(() => prepareRecord("LIGUES", { nomLigue: "Ligue FECOT", idProvince: "PRO02", statut: "ACTIF" }, tables, refs, "01", "unused"))
})
