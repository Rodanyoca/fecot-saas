// @ts-expect-error Node requires explicit TypeScript extensions.
import { mapLigueRow } from "./mappers/ligues.ts"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { mapEntenteRow } from "./mappers/ententes.ts"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { mapClubRow } from "./mappers/clubs.ts"
import type { Province } from "./types"
import type { TerritorialTables, ReferenceTables } from "./territorial-store"
export function mapTerritory(tables: TerritorialTables, refs: ReferenceTables) {
  const provinceNames = new Map(refs.PROVINCES.rows.map(row => [row.id_province, row.nom_province]))
  const cityNames = new Map(refs.VILLES.rows.map(row => [row.id_ville, row.nom_ville]))
  const categoryNames = new Map(refs.CATEGORIES_CLUB.rows.map(row => [row.id_categorie_club, row.nom_categorie_club]))
  const sexNames = new Map(refs.SEXES.rows.map(row => [row.id_sexe, row.nom_sexe]))
  const ligues = tables.LIGUES.rows.map(row => mapLigueRow({ ...row, nom_province: provinceNames.get(row.id_province) || "" }))
  const liguesById = new Map(ligues.map(row => [row.idLigue, row]))
  const ententes = tables.ENTENTES.rows.map(row => {
    const ligue = liguesById.get(row.id_ligue)
    return mapEntenteRow({ ...row, nom_ligue: ligue?.nomLigue, id_province: ligue?.idProvince, nom_province: ligue?.nomProvince, nom_ville: cityNames.get(row.id_ville) })
  })
  const ententesById = new Map(ententes.map(row => [row.idEntente, row]))
  const clubs = tables.CLUBS.rows.map(row => {
    const entente = ententesById.get(row.id_entente)
    const ligue = entente ? liguesById.get(entente.idLigue) : undefined
    return mapClubRow({ ...row, id_ligue: ligue?.idLigue, nom_ligue: ligue?.nomLigue, sigle_ligue: ligue?.sigleLigue || "", id_province: ligue?.idProvince, nom_province: ligue?.nomProvince, nom_entente: entente?.nomEntente, sigle_entente: entente?.sigleEntente || "", pseudo_entente: entente?.pseudoEntente || entente?.nomEntente, nom_ville: cityNames.get(row.id_ville), nom_categorie_club: categoryNames.get(row.id_categorie_club), nom_sexe: sexNames.get(row.id_sexe), logo_drive_url: row.logo_drive_id ? `/api/club-logos/${encodeURIComponent(row.logo_drive_id)}` : "" })
  })
  const provinces = refs.PROVINCES.rows.map(row => ({ idProvince: row.id_province, nomProvince: row.nom_province, id: row.id_province, nom: row.nom_province, statut: row.statut || "", chefLieu: "", responsable: "", telephone: "", email: "", ligues: 0, ententes: 0, clubs: 0, athletes: 0, coachs: 0, arbitres: 0, medecins: 0, completude: 0 } satisfies Province))
  const cities = refs.VILLES.rows.map(row => ({ id: row.id_ville, nom: row.nom_ville, provinceId: row.id_province }))
  return { ligues, ententes, clubs, provinces, cities, categories: refs.CATEGORIES_CLUB.rows.map(row => ({ id: row.id_categorie_club, nom: row.nom_categorie_club })), sexes: refs.SEXES.rows.map(row => ({ id: row.id_sexe, nom: row.nom_sexe })) }
}
