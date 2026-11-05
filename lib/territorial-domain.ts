// @ts-expect-error Node's test runner requires explicit TypeScript extensions.
import { formatDateForSheet } from "./compact-date.ts"
import type { Row, Sheet, Table } from "./territorial-schema.ts"
// @ts-expect-error Node's test runner requires explicit TypeScript extensions.
import { ententeIdentity, EntenteKeyMigrationRequired } from "./entente-id.ts"
type Tables = Record<Sheet, Table>
type Refs = Record<"PROVINCES" | "VILLES" | "CATEGORIES_CLUB" | "SEXES", Table>
const text = (value: unknown) => typeof value === "string" ? value.trim() : ""
const requiredText = (value: unknown, name: string) => { const result = text(value); if (!result) throw new Error(`${name} obligatoire.`); return result }
const date = (value: unknown) => {
  const result = text(value)
  if (!result) return ""
  if (!/^(?:\d{8}|\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/.test(result)) throw new Error("Date invalide : saisissez JJMMAAAA.")
  return formatDateForSheet(result)
}
const exists = (rows: Row[], key: string, id: string, name: string) => { const row = rows.find(row => row[key] === id); if (!row) throw new Error(`${name} introuvable.`); return row }

export function prepareRecord(sheet: Sheet, payload: Record<string, unknown>, tables: Tables, refs: Refs, existingId: string | undefined, newId: string) {
  const idKey = sheet === "LIGUES" ? "id_ligue" : sheet === "ENTENTES" ? "id_entente" : "id_club"
  const current = existingId ? exists(tables[sheet].rows, idKey, existingId, "Structure") : undefined
  if (payload[idKey] !== undefined || payload.id !== undefined) throw new Error("L’identifiant technique ne peut pas être fourni.")
  const identity = sheet === "ENTENTES" ? ententeIdentity(payload.idLigue, payload.codeEntente) : undefined
  const id = current?.[idKey] || identity?.idEntente || newId
  if (current && identity) {
    // Never rename only the parent row: dependencies can live in other workbooks.
    const original = ententeIdentity(current.id_ligue, current.code_entente)
    if (original.idLigue !== identity.idLigue || original.codeEntente !== identity.codeEntente) throw new EntenteKeyMigrationRequired()
  }
  if (!current && tables[sheet].rows.some(row => row[idKey] === id)) throw new Error("Identifiant déjà présent.")
  const rawStatus = text(payload.statut).toUpperCase()
  const status = rawStatus === "ACTIVE" ? "ACTIF" : rawStatus === "INACTIVE" ? "INACTIF" : rawStatus
  if (!["ACTIF", "INACTIF"].includes(status)) throw new Error("Statut invalide.")
  const email = text(payload.emailLigue ?? payload.emailEntente ?? payload.email)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Adresse e-mail invalide.")
  const record: Row = { statut: status, email, telephone: text(payload.telephone), observations: text(payload.observations) }
  if (!current) record[idKey] = id
  let provinceId = ""
  if (sheet === "LIGUES") {
    record.nom_ligue = requiredText(payload.nomLigue, "Nom de la ligue")
    record.id_province = requiredText(payload.idProvince, "Province")
    exists(refs.PROVINCES.rows, "id_province", record.id_province, "Province")
    record.année_creation = text(payload.anneeCreation)
    if (record.année_creation && (!/^\d{4}$/.test(record.année_creation) || Number(record.année_creation) < 1900 || Number(record.année_creation) > new Date().getFullYear())) throw new Error("Année de création invalide.")
    record.date_affiliation_ligue = date(payload.dateAffiliation)
    if (record.année_creation && record.date_affiliation_ligue && Number(record.date_affiliation_ligue.slice(0, 4)) < Number(record.année_creation)) throw new Error("L’affiliation précède la création.")
    record.sigle_ligue = text(payload.sigleLigue)
    if (tables.LIGUES.rows.some(row => row.id_ligue !== id && row.id_province === record.id_province && row.nom_ligue.toLocaleLowerCase() === record.nom_ligue.toLocaleLowerCase())) throw new Error("Cette ligue existe déjà dans cette province.")
  } else {
    const entente = sheet === "CLUBS" ? exists(tables.ENTENTES.rows, "id_entente", requiredText(payload.idEntente, "Entente"), "Entente") : undefined
    const ligueId = entente?.id_ligue || requiredText(payload.idLigue, "Ligue")
    if (sheet === "CLUBS" && text(payload.idLigue) && text(payload.idLigue) !== ligueId) throw new Error("La ligue ne correspond pas à l’entente.")
    provinceId = exists(tables.LIGUES.rows, "id_ligue", ligueId, "Ligue").id_province
    record.id_ville = text(payload.idVille)
    if (record.id_ville && exists(refs.VILLES.rows, "id_ville", record.id_ville, "Ville").id_province !== provinceId) throw new Error("La ville ne correspond pas à la province de la ligue.")
    record.date_creation = date(payload.dateCreation)
    const codeKey = sheet === "CLUBS" ? "code_club" : "code_entente"
    const nameKey = sheet === "CLUBS" ? "nom_club" : "nom_entente"
    const parentKey = sheet === "CLUBS" ? "id_entente" : "id_ligue"
    record[codeKey] = identity?.codeEntente || requiredText(payload.codeClub, "Code")
    if (record[codeKey].length > 30 || /[\r\n]/.test(record[codeKey])) throw new Error("Code invalide.")
    record[nameKey] = requiredText(payload[sheet === "CLUBS" ? "nomClub" : "nomEntente"], "Nom")
    record[parentKey] = sheet === "CLUBS" ? entente!.id_entente : ligueId
    record[sheet === "CLUBS" ? "sigle_club" : "sigle_entente"] = text(payload[sheet === "CLUBS" ? "sigleClub" : "pseudoEntente"])
    if (tables[sheet].rows.some(row => {
      if (row[idKey] === id || row[parentKey] !== record[parentKey]) return false
      let code = row[codeKey]
      if (identity) {
        try { code = ententeIdentity(row.id_ligue, code).codeEntente }
        catch { /* An invalid legacy code stays readable, but cannot disguise a valid duplicate. */ }
      }
      return code.toLocaleLowerCase() === record[codeKey].toLocaleLowerCase() || row[nameKey].toLocaleLowerCase() === record[nameKey].toLocaleLowerCase()
    })) throw new Error("Ce code ou ce nom existe déjà dans cette structure parente.")
    if (sheet === "ENTENTES") record.date_reconnaissance = date(payload.dateReconnaissance)
    else {
      record.date_affiliation = date(payload.dateAffiliationClub)
      record.id_categorie_club = text(payload.idCategorieClub)
      record.id_sexe = text(payload.idSexe)
      if (record.id_categorie_club) exists(refs.CATEGORIES_CLUB.rows, "id_categorie_club", record.id_categorie_club, "Catégorie")
      if (record.id_sexe) exists(refs.SEXES.rows, "id_sexe", record.id_sexe, "Sexe")
      // id_ligue_historique and logo columns are preserved on update.
    }
    const end = record.date_reconnaissance || record.date_affiliation
    if (record.date_creation && end && end < record.date_creation) throw new Error("La reconnaissance ou l’affiliation précède la création.")
  }
  if (Object.values(record).some(value => value.length > 5000)) throw new Error("Un champ dépasse la longueur autorisée.")
  if (sheet === "LIGUES" && current && current.id_province !== record.id_province) {
    const ententes = tables.ENTENTES.rows.filter(row => row.id_ligue === id)
    const ids = new Set(ententes.map(row => row.id_entente))
    const cities = [...ententes, ...tables.CLUBS.rows.filter(row => ids.has(row.id_entente))].map(row => row.id_ville).filter(Boolean)
    if (cities.some(city => refs.VILLES.rows.find(row => row.id_ville === city)?.id_province !== record.id_province)) throw new Error("Des villes des structures liées sont incompatibles avec cette province.")
  }
  if (sheet === "ENTENTES" && current && current.id_ligue !== record.id_ligue && tables.CLUBS.rows.filter(row => row.id_entente === id && row.id_ville).some(club => refs.VILLES.rows.find(row => row.id_ville === club.id_ville)?.id_province !== provinceId)) throw new Error("Des villes des clubs liés sont incompatibles avec cette ligue.")
  return { id, record }
}
