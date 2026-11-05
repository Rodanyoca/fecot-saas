import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"

import { google } from "googleapis"
import nextEnv from "@next/env"

// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { dryRunFirstSuperAdmin, executeFirstSuperAdmin } from "../lib/users/bootstrap.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { USERS_SHEET, type SheetRow, type UsersSheetsAdapter } from "../lib/users/types.ts"

const CONFIRMATION = "CREER LE PREMIER SUPER ADMINISTRATEUR"

nextEnv.loadEnvConfig(process.cwd())

function argument(name: string): string {
  const index = process.argv.indexOf(`--${name}`)
  const value = index >= 0 ? process.argv[index + 1]?.trim() : ""
  if (!value || value.startsWith("--")) throw new Error(`Argument --${name} obligatoire.`)
  return value
}

function privateKey(): string {
  return (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n")
}

function auth(scopes: string[]) {
  const email = process.env.GOOGLE_CLIENT_EMAIL?.trim()
  const key = privateKey()
  if (email && key) return new google.auth.JWT({ email, key, scopes })

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim()
  if (clientId && clientSecret && refreshToken) {
    const oauth = new google.auth.OAuth2(clientId, clientSecret)
    oauth.setCredentials({ refresh_token: refreshToken })
    return oauth
  }
  throw new Error("Identifiants Google Sheets absents de l'environnement d'exécution.")
}

function records(values: unknown[][]): SheetRow[] {
  if (values.length === 0) return []
  const [headers, ...rows] = values
  return rows.map((row) => Object.fromEntries(
    headers.map((header, index) => [String(header ?? "").trim(), (typeof row[index] === "boolean" ? String(row[index]).toUpperCase() : String(row[index] ?? ""))])
  ))
}

function createCliAdapter(): UsersSheetsAdapter {
  const spreadsheetId = (process.env.FECOT_USERS_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_USERS_SPREADSHEET_ID)?.trim()
  if (!spreadsheetId) throw new Error("FECOT_USERS_SPREADSHEET_ID absent de l'environnement d'exécution.")

  return {
    async readHeaders(sheetName) {
      const sheets = google.sheets({ version: "v4", auth: auth(["https://www.googleapis.com/auth/spreadsheets.readonly"]) })
      const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${sheetName}'!1:1` })
      return (result.data.values?.[0] ?? []).map((value) => String(value ?? "").trim()).filter(Boolean)
    },
    async readRows(sheetName) {
      const sheets = google.sheets({ version: "v4", auth: auth(["https://www.googleapis.com/auth/spreadsheets.readonly"]) })
      const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${sheetName}'!A:Z` })
      return records((result.data.values ?? []) as unknown[][])
    },
    async appendRow(sheetName, row) {
      if (sheetName !== USERS_SHEET) throw new Error("Ce CLI peut écrire uniquement dans USERS.")
      const sheets = google.sheets({ version: "v4", auth: auth(["https://www.googleapis.com/auth/spreadsheets"]) })
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${USERS_SHEET}'!A:ZZ`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [((await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${USERS_SHEET}'!1:1` })).data.values?.[0] || []).map((header) => row[String(header).trim()] ?? "")] },
      })
    },
  }
}

async function main() {
  const input = {
    idUser: argument("id"),
    nomComplet: argument("nom"),
    email: argument("email"),
  }
  const adapter = createCliAdapter()
  const dryRun = await dryRunFirstSuperAdmin(adapter, input)

  stdout.write(`${JSON.stringify(dryRun, null, 2)}\n`)
  if (!process.argv.includes("--execute")) {
    stdout.write("Contrôle à blanc terminé. Aucune écriture effectuée.\n")
    return
  }

  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Le mode --execute exige un terminal interactif.")
  }
  const terminal = createInterface({ input: stdin, output: stdout })
  const answer = await terminal.question(`Tapez exactement « ${CONFIRMATION} » pour écrire une ligne USERS : `)
  terminal.close()
  if (answer !== CONFIRMATION) throw new Error("Confirmation refusée. Aucune écriture effectuée.")

  const result = await executeFirstSuperAdmin({ adapter, input })
  stdout.write("Compte créé et vérifié. Copiez maintenant l'accès temporaire ; il ne sera plus affiché.\n")
  stdout.write(`${result.temporaryAccess}\n`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Échec inconnu."
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
