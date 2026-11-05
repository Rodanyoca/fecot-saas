import "server-only"
import { google } from "googleapis"
import { mapTable, schema, columnLetter, type Table, type Row, type Sheet } from "./territorial-schema"

export const configured = () => Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID && process.env.FECOT_REFERENTIELS_SPREADSHEET_ID)
export function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Configuration manquante : ${name}.`)
  return value
}
export function sheetsClient() {
  const auth = new google.auth.JWT({ email: required("GOOGLE_CLIENT_EMAIL"), key: required("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"), scopes: ["https://www.googleapis.com/auth/spreadsheets"] })
  return google.sheets({ version: "v4", auth })
}
const refsSchema = {
  PROVINCES: ["id_province", "nom_province"], VILLES: ["id_ville", "id_province", "nom_ville"],
  CATEGORIES_CLUB: ["id_categorie_club", "nom_categorie_club"], SEXES: ["id_sexe", "nom_sexe"],
}
export type TerritorialTables = Record<Sheet, Table>
export type ReferenceTables = Record<keyof typeof refsSchema, Table>
export async function readTables(): Promise<{ tables: TerritorialTables; refs: ReferenceTables }> {
  const client = sheetsClient()
  const specs = [schema, refsSchema] as const
  const ids = [required("FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID"), required("FECOT_REFERENTIELS_SPREADSHEET_ID")]
  const results = await Promise.all(specs.map(async (spec, index) => {
    const names = Object.keys(spec)
    const result = await client.spreadsheets.values.batchGet({ spreadsheetId: ids[index], ranges: names.map(name => `'${name}'!A:AZ`) }, { timeout: 15000, retry: false })
    return Object.fromEntries(names.map((name, position) => [name, mapTable(result.data.valueRanges?.[position]?.values || [], spec[name as keyof typeof spec])]))
  }))
  return { tables: results[0] as TerritorialTables, refs: results[1] as ReferenceTables }
}
export async function writeRecord(sheet: Sheet, table: Table, id: string, record: Row, editing: boolean) {
  const client = sheetsClient(), spreadsheetId = required("FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID")
  if (Object.keys(record).some(key => !table.headers.includes(key))) throw new Error("Une colonne de destination est absente.")
  if (!editing) {
    await client.spreadsheets.values.append({ spreadsheetId, range: `'${sheet}'!A:AZ`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: [table.headers.map(name => record[name] ?? "")] } }, { timeout: 15000, retry: false })
  } else {
    const idIndex = table.headers.indexOf(schema[sheet][0])
    const matches = table.values.flatMap((row, index) => index > 0 && String(row[idIndex] ?? "").trim() === id ? [index + 1] : [])
    if (matches.length !== 1) throw new Error("Structure absente ou ambiguë.")
    await client.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: Object.entries(record).map(([key, value]) => ({ range: `'${sheet}'!${columnLetter(table.headers.indexOf(key))}${matches[0]}`, values: [[value]] })) } }, { timeout: 15000, retry: false })
  }
}
