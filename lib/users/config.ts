import "server-only"

export function getUsersSpreadsheetId(): string {
  const id = (process.env.FECOT_USERS_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_USERS_SPREADSHEET_ID)?.trim()
  if (!id) throw new Error("FECOT_USERS_SPREADSHEET_ID est manquant.")
  return id
}
