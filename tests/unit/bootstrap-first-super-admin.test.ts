import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { verifyPassword } from "../../lib/auth/password.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { dryRunFirstSuperAdmin, executeFirstSuperAdmin } from "../../lib/users/bootstrap.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { UsersDataError } from "../../lib/users/errors.ts"
import {
  AUDIT_LOG_HEADERS,
  AUDIT_LOG_SHEET,
  AUTH_ATTEMPT_HEADERS,
  AUTH_ATTEMPTS_SHEET,
  USER_AUTHORIZATION_HEADERS,
  USER_AUTHORIZATIONS_SHEET,
  USER_HEADERS,
  USERS_SHEET,
  type SheetRow,
  type UsersSheetsAdapter,
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
} from "../../lib/users/types.ts"

class BootstrapAdapter implements UsersSheetsAdapter {
  appendCount = 0
  rows = new Map<string, SheetRow[]>([
    [USERS_SHEET, []],
    [USER_AUTHORIZATIONS_SHEET, []],
    [AUTH_ATTEMPTS_SHEET, []],
    [AUDIT_LOG_SHEET, []],
  ])
  headers = new Map<string, string[]>([
    [USERS_SHEET, [...USER_HEADERS]],
    [USER_AUTHORIZATIONS_SHEET, [...USER_AUTHORIZATION_HEADERS]],
    [AUTH_ATTEMPTS_SHEET, [...AUTH_ATTEMPT_HEADERS]],
    [AUDIT_LOG_SHEET, [...AUDIT_LOG_HEADERS]],
  ])

  async readHeaders(sheetName: string): Promise<string[]> {
    return this.headers.get(sheetName) ?? []
  }
  async readRows(sheetName: string): Promise<SheetRow[]> {
    return structuredClone(this.rows.get(sheetName) ?? [])
  }
  async appendRow(sheetName: string, row: SheetRow): Promise<void> {
    this.appendCount += 1
    this.rows.set(sheetName, [...(this.rows.get(sheetName) ?? []), structuredClone(row)])
  }
}

const input = { idUser: "USR-0001", nomComplet: "Premier Administrateur", email: "ADMIN@EXAMPLE.COM" }

test("le contrôle à blanc valide une feuille vide sans écrire", async () => {
  const adapter = new BootstrapAdapter()
  const report = await dryRunFirstSuperAdmin(adapter, input)
  assert.equal(report.mode, "DRY_RUN")
  assert.equal(report.email, "admin@example.com")
  assert.equal(report.sessionVersion, 1)
  assert.equal(adapter.appendCount, 0)
})

test("l'amorçage écrit seulement le hash et impose activation sous 24 heures", async () => {
  const adapter = new BootstrapAdapter()
  const temporaryAccess = "Abcdef23456789GhJkmN"
  const now = new Date("2026-08-31T10:00:00.000Z")
  const result = await executeFirstSuperAdmin({ adapter, input, now, generateAccess: () => temporaryAccess })
  const row = adapter.rows.get(USERS_SHEET)?.[0]

  assert.equal(adapter.appendCount, 1)
  assert.equal(row?.password_hash.includes(temporaryAccess), false)
  assert.equal(await verifyPassword(temporaryAccess, row?.password_hash ?? ""), true)
  assert.equal(row?.type_user, "ADMIN")
  assert.equal(row?.est_super_admin, "TRUE")
  assert.equal(row?.doit_changer_mot_de_passe, "TRUE")
  assert.equal(row?.date_expiration_acces_temporaire, "2026-09-01T10:00:00.000Z")
  assert.equal(row?.session_version, "1")
  assert.equal(result.temporaryAccess, temporaryAccess)
})

test("refuse l'amorçage si USERS contient déjà un compte", async () => {
  const adapter = new BootstrapAdapter()
  await executeFirstSuperAdmin({ adapter, input, generateAccess: () => "Abcdef23456789GhJkmN" })
  await assert.rejects(
    () => dryRunFirstSuperAdmin(adapter, { ...input, idUser: "USR-0002" }),
    (error: unknown) => error instanceof UsersDataError && error.code === "CONFLICT"
  )
})

test("la commande USERS est idempotente après une première création confirmée", async () => {
  const adapter = new BootstrapAdapter()
  const first = await executeFirstSuperAdmin({ adapter, input, generateAccess: () => "Abcdef23456789GhJkmN" })
  // @ts-expect-error Node native TypeScript imports.
  const { UserCommands } = await import("../../lib/users/commands.ts")
  const repeated = await new UserCommands(adapter).createUser({ user: first.user })
  assert.equal(repeated.status, "EXISTING")
  assert.equal(adapter.appendCount, 1)
})
