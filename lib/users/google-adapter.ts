import "server-only"

import { env } from "@/lib/env"
import { getUsersSpreadsheetId } from "./config"
import type { UsersSheetsAdapter } from "./types"

import { mapUsersTable, userCellUpdates, type UsersTable } from "./sheet-table"
const inflight = new Map<string, Promise<Record<string, UsersTable>>>()

async function client() {
  if (!env.googleSheets.clientEmail || !env.googleSheets.privateKey) throw new Error("Identifiants Google Sheets absents.")
  const { google } = await import("googleapis")
  const auth = new google.auth.JWT({ email: env.googleSheets.clientEmail, key: env.googleSheets.privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets"] })
  return google.sheets({ version: "v4", auth })
}
function range(sheet: string) { return "'" + sheet.replaceAll("'", "''") + "'!A:ZZ" }
export async function readUsersTables(sheetNames: readonly string[]): Promise<Record<string, UsersTable>> {
  const spreadsheetId = getUsersSpreadsheetId()
  const names = [...new Set(sheetNames)].sort()
  const key = spreadsheetId + ":" + names.join("|")
  const current = inflight.get(key)
  if (current) return current
  const request = (async () => {
    const sheets = await client()
    const result = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges: names.map(range) }, { timeout: 15000, retry: false })
    return Object.fromEntries(names.map((name, index) => [name, mapUsersTable(result.data.valueRanges?.[index]?.values || [])]))
  })().finally(() => inflight.delete(key))
  inflight.set(key, request)
  return request
}
// Cache limited to this adapter instance. Every mutation invalidates it before confirmation.
export function createGoogleUsersSheetsAdapter(seed: Record<string, UsersTable> = {}): UsersSheetsAdapter {
  const tables = new Map(Object.entries(seed).map(([name, table]) => [name, Promise.resolve(table)]))
  function read(name: string) {
    let pending = tables.get(name)
    if (!pending) { pending = readUsersTables([name]).then(result => result[name]); tables.set(name, pending) }
    return pending
  }
  return {
    async readHeaders(name) { return (await read(name)).headers },
    async readRows(name) { return (await read(name)).rows.map(row => ({ ...row })) },
    async appendRow(name, row) {
      const table = await read(name), sheets = await client()
      try {
        await sheets.spreadsheets.values.append({ spreadsheetId: getUsersSpreadsheetId(), range: range(name), valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: [table.headers.map(header => row[header] ?? "")] } }, { timeout: 15000, retry: false })
      } finally { tables.delete(name) }
    },
    async updateRow(name, idColumn, idValue, updates) {
      const sheets = await client()
      // Locate the real row in the raw matrix, including blank lines, by header name.
      const response = await sheets.spreadsheets.values.get({ spreadsheetId: getUsersSpreadsheetId(), range: range(name) }, { timeout: 15000, retry: false })
      const data = userCellUpdates(name, response.data.values || [], idColumn, idValue, updates)
      try { await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: getUsersSpreadsheetId(), requestBody: { valueInputOption: "RAW", data } }, { timeout: 15000, retry: false }) }
      finally { tables.delete(name) }
    },
  }
}
