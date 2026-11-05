import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { mapTerritory } from "../lib/territorial-view-model.ts"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { mapTable, schema } from "../lib/territorial-schema.ts"
import type { Row } from "../lib/territorial-schema.ts"

const table = (headers: readonly string[], rows: Row[]) => mapTable([[...headers], ...rows.map(row => headers.map(key => row[key] || ""))], headers)
test("club league comes exclusively from its entente, labels resolve by ID, history is untouched", () => {
  const tables = {
    LIGUES: table(schema.LIGUES, [{ id_ligue: "01", id_province: "PRO01", nom_ligue: "Current", sigle_ligue: "LC" }, { id_ligue: "26", id_province: "PRO26", nom_ligue: "Historical", sigle_ligue: "HIST" }]),
    ENTENTES: table(schema.ENTENTES, [{ id_entente: "E", id_ligue: "01", nom_entente: "Parent", sigle_entente: "EP", id_ville: "V", code_entente: "01" }]),
    CLUBS: table(schema.CLUBS, [{ id_club: "C", id_entente: "E", id_ligue_historique: "26", id_ville: "V", nom_club: "Club", id_categorie_club: "CAT", id_sexe: "SEX", logo_drive_id: "file" }, { id_club: "orphan", id_entente: "missing", id_ligue_historique: "26", nom_club: "Orphan" }]),
  }
  const refs = {
    PROVINCES: table(["id_province", "nom_province"], [{ id_province: "PRO01", nom_province: "Kinshasa" }, { id_province: "PRO26", nom_province: "Sankuru" }]),
    VILLES: table(["id_ville", "id_province", "nom_ville"], [{ id_ville: "V", id_province: "PRO01", nom_ville: "Ville" }]),
    CATEGORIES_CLUB: table(["id_categorie_club", "nom_categorie_club"], [{ id_categorie_club: "CAT", nom_categorie_club: "Amateur" }]),
    SEXES: table(["id_sexe", "nom_sexe"], [{ id_sexe: "SEX", nom_sexe: "Mixte" }]),
  }
  const data = mapTerritory(tables, refs)
  assert.equal(data.clubs[0].idLigue, "01")
  assert.equal(data.clubs[0].sigleEntente, "EP")
  assert.equal(data.clubs[0].sigleLigue, "LC")
  assert.equal(data.clubs[0].idLigueHistorique, "26")
  assert.equal(data.clubs[0].categorie, "Amateur")
  assert.equal(data.clubs[0].version, "Mixte")
  assert.equal(data.clubs[0].ville, "Ville")
  assert.equal(data.clubs[0].logoDriveUrl, "/api/club-logos/file")
  assert.equal(data.clubs[1].idLigue, "")
  assert.equal(data.clubs[1].sigleEntente, "")
  assert.equal(data.clubs[1].sigleLigue, "")
  assert.equal(tables.CLUBS.rows[0].id_ligue_historique, "26")
})
