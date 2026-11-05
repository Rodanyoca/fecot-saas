export type Row = Record<string, string>
export type Table = { headers: string[]; rows: Row[]; values: unknown[][] }
export const schema = {
  LIGUES: ["id_ligue", "id_province", "nom_ligue", "année_creation", "date_affiliation_ligue", "email", "telephone", "statut", "observations", "sigle_ligue"],
  ENTENTES: ["id_entente", "id_ligue", "id_ville", "code_entente", "nom_entente", "sigle_entente", "date_creation", "date_reconnaissance", "email", "telephone", "statut", "observations"],
  CLUBS: ["id_club", "id_ville", "code_club", "id_ligue_historique", "id_entente", "nom_club", "sigle_club", "id_categorie_club", "id_sexe", "date_creation", "date_affiliation", "email", "telephone", "statut", "observations", "logo_drive_id", "logo_drive_url"],
} as const
export type Sheet = keyof typeof schema
export function mapTable(values: unknown[][], required: readonly string[]): Table {
  const headers = (values[0] || []).map(value => String(value ?? "").trim())
  const named = headers.filter(Boolean)
  if (new Set(named).size !== named.length || required.some(name => !named.includes(name))) throw new Error("En-têtes absents ou dupliqués dans le classeur.")
  const rows = values.slice(1).filter(row => row.some(value => String(value ?? "").trim())).map(row => Object.fromEntries(headers.flatMap((name, index) => name ? [[name, String(row[index] ?? "").trim()]] : [])))
  const id = required[0]
  const ids = rows.map(row => row[id]).filter(Boolean)
  if (ids.length !== rows.length || new Set(ids).size !== ids.length) throw new Error("Identifiants absents ou dupliqués dans le classeur.")
  return { headers, rows, values }
}
export function columnLetter(index: number) {
  let result = ""
  for (let number = index + 1; number > 0; number = Math.floor((number - 1) / 26)) result = String.fromCharCode(65 + (number - 1) % 26) + result
  return result
}
