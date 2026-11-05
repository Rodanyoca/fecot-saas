import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { UsersDataError } from "../../lib/users/errors.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { UsersRepository } from "../../lib/users/repository.ts"
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

class MemoryAdapter implements UsersSheetsAdapter {
  readonly reads: Array<{ kind: "headers" | "rows"; sheet: string; fresh: boolean }> = []
  readonly headers = new Map<string, string[]>([
    [USERS_SHEET, [...USER_HEADERS]],
    [USER_AUTHORIZATIONS_SHEET, [...USER_AUTHORIZATION_HEADERS]],
    [AUTH_ATTEMPTS_SHEET, [...AUTH_ATTEMPT_HEADERS]],
    [AUDIT_LOG_SHEET, [...AUDIT_LOG_HEADERS]],
  ])
  readonly rows = new Map<string, SheetRow[]>([
    [USERS_SHEET, []],
    [USER_AUTHORIZATIONS_SHEET, []],
    [AUTH_ATTEMPTS_SHEET, []],
    [AUDIT_LOG_SHEET, []],
  ])
  failRead: unknown = null
  confirmWrites = true

  async readHeaders(sheetName: string, options: { fresh: true }): Promise<string[]> {
    this.reads.push({ kind: "headers", sheet: sheetName, fresh: options.fresh })
    if (this.failRead) throw this.failRead
    return this.headers.get(sheetName) ?? []
  }

  async readRows(sheetName: string, options: { fresh: true }): Promise<SheetRow[]> {
    this.reads.push({ kind: "rows", sheet: sheetName, fresh: options.fresh })
    if (this.failRead) throw this.failRead
    return structuredClone(this.rows.get(sheetName) ?? [])
  }

  async appendRow(sheetName: string, row: SheetRow): Promise<void> {
    if (!this.confirmWrites) return
    this.rows.set(sheetName, [...(this.rows.get(sheetName) ?? []), structuredClone(row)])
  }
}

const userRow = (id: string, email: string): SheetRow => ({
  id_user: id,
  nom_complet: `Utilisateur ${id}`,
  email,
  password_hash: "scrypt$v1$test",
  type_user: "ADMIN",
  est_super_admin: "FALSE",
  doit_changer_mot_de_passe: "TRUE",
  statut: "ACTIF",
  date_creation: "2026-08-31T10:00:00+01:00",
  date_modification_mot_de_passe: "",
  derniere_connexion: "",
  session_version: "1",
  date_expiration_acces_temporaire: "2026-09-01T10:00:00+01:00",
})

test("force toutes les lectures de sécurité en mode frais", async () => {
  const adapter = new MemoryAdapter()
  adapter.rows.set(USERS_SHEET, [userRow("USR-001", "test@example.com")])
  const repository = new UsersRepository(adapter)

  assert.equal((await repository.getUserByEmail(" TEST@example.com "))?.idUser, "USR-001")
  assert.ok(adapter.reads.length >= 2)
  assert.ok(adapter.reads.every((read) => read.fresh === true))
})

test("refuse les e-mails normalisés dupliqués", async () => {
  const adapter = new MemoryAdapter()
  adapter.rows.set(USERS_SHEET, [
    userRow("USR-001", "test@example.com"),
    userRow("USR-002", " TEST@EXAMPLE.COM "),
  ])
  await assert.rejects(
    () => new UsersRepository(adapter).getUsers(),
    (error: unknown) => error instanceof UsersDataError && error.code === "CONFLICT"
  )
})

test("distingue une source indisponible d'un schéma invalide", async () => {
  const unavailable = new MemoryAdapter()
  unavailable.failRead = new Error("timeout")
  await assert.rejects(
    () => new UsersRepository(unavailable).getUsers(),
    (error: unknown) => error instanceof UsersDataError && error.code === "SOURCE_UNAVAILABLE"
  )

  const invalidSchema = new MemoryAdapter()
  invalidSchema.headers.set(USERS_SHEET, ["id_user"])
  await assert.rejects(
    () => new UsersRepository(invalidSchema).getUsers(),
    (error: unknown) => error instanceof UsersDataError && error.code === "SCHEMA_INVALID"
  )
})

test("refuse les périodes actives qui se chevauchent, bornes inclusives", async () => {
  const adapter = new MemoryAdapter()
  adapter.rows.set(USER_AUTHORIZATIONS_SHEET, [
    {
      id_user_autorisation: "UA-001",
      id_user: "USR-001",
      id_bloc_autorisation: "AUT-SPT",
      statut: "ACTIF",
      date_debut: "2026-08-01",
      date_fin: "2026-08-31",
    },
    {
      id_user_autorisation: "UA-002",
      id_user: "USR-001",
      id_bloc_autorisation: "AUT-SPT",
      statut: "ACTIF",
      date_debut: "2026-08-31",
      date_fin: "",
    },
  ])
  await assert.rejects(
    () => new UsersRepository(adapter).getUserAuthorizations(),
    (error: unknown) => error instanceof UsersDataError && error.code === "CONFLICT"
  )
})

test("rend les ajouts techniques idempotents et vérifie la relecture", async () => {
  const adapter = new MemoryAdapter()
  const repository = new UsersRepository(adapter)
  const attempt = {
    idTentative: "AT-001",
    identifiantHash: "email-hmac",
    ipHash: "ip-hmac",
    dateTentative: "2026-08-31T10:00:00+01:00",
    resultat: "ECHEC" as const,
    requestId: "REQ-001",
  }

  assert.equal(await repository.appendAuthAttempt(attempt), "CREATED")
  assert.equal(await repository.appendAuthAttempt(attempt), "EXISTING")
  assert.equal(adapter.rows.get(AUTH_ATTEMPTS_SHEET)?.length, 1)

  const notConfirmed = new MemoryAdapter()
  notConfirmed.confirmWrites = false
  await assert.rejects(
    () => new UsersRepository(notConfirmed).appendAuthAttempt({ ...attempt, requestId: "REQ-002" }),
    (error: unknown) => error instanceof UsersDataError && error.code === "WRITE_NOT_CONFIRMED"
  )
})
