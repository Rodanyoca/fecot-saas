import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { resolveSession } from "../../lib/auth/session-resolution.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { createSessionToken } from "../../lib/auth/session-token.ts"
import type { User } from "../../lib/users/types.ts"

const secret = "resolution-test-secret"
const now = 2_000_000_000
const activeUser: User = {
  idUser: "USR-1", nomComplet: "Utilisateur Test", email: "test@example.org", passwordHash: "hash",
  typeUser: "ADMIN", estSuperAdmin: false, doitChangerMotDePasse: false, statut: "ACTIF",
  dateCreation: "2026-01-01T00:00:00+01:00", dateModificationMotDePasse: null, derniereConnexion: null,
  sessionVersion: 4, dateExpirationAccesTemporaire: null,
}

async function token(version = 4) {
  return createSessionToken({ idUser: activeUser.idUser, sessionVersion: version, secret, nowSeconds: now })
}

test("relit l'utilisateur et accepte un compte actif de même version", async () => {
  let reads = 0
  const result = await resolveSession({ token: await token(), secret, nowSeconds: now, loadUser: async () => { reads++; return activeUser } })
  assert.equal(result.ok, true)
  assert.equal(reads, 1)
})

test("refuse par défaut compte absent, inactif et bloqué", async () => {
  const signed = await token()
  const absent = await resolveSession({ token: signed, secret, nowSeconds: now, loadUser: async () => null })
  assert.deepEqual(absent, { ok: false, reason: "USER_NOT_FOUND" })
  for (const statut of ["INACTIF", "BLOQUE"] as const) {
    const result = await resolveSession({ token: signed, secret, nowSeconds: now, loadUser: async () => ({ ...activeUser, statut }) })
    assert.deepEqual(result, { ok: false, reason: "USER_DISABLED" })
  }
})

test("révoque une session dont session_version diffère", async () => {
  const result = await resolveSession({ token: await token(3), secret, nowSeconds: now, loadUser: async () => activeUser })
  assert.deepEqual(result, { ok: false, reason: "SESSION_REVOKED" })
})

test("échoue fermé lors d'une panne Sheets", async () => {
  const result = await resolveSession({ token: await token(), secret, nowSeconds: now, loadUser: async () => { throw new Error("Sheets indisponible") } })
  assert.deepEqual(result, { ok: false, reason: "SOURCE_UNAVAILABLE" })
})

test("marque la session minimale quand le mot de passe doit changer", async () => {
  const result = await resolveSession({ token: await token(), secret, nowSeconds: now, loadUser: async () => ({ ...activeUser, doitChangerMotDePasse: true, dateExpirationAccesTemporaire: new Date((now + 60) * 1000).toISOString() }) })
  assert.equal(result.ok && result.requiresActivation, true)
})

test("refuse un accès temporaire absent ou expiré", async () => {
  for (const expiration of [null, new Date(now * 1000).toISOString()]) {
    const result = await resolveSession({ token: await token(), secret, nowSeconds: now, loadUser: async () => ({ ...activeUser, doitChangerMotDePasse: true, dateExpirationAccesTemporaire: expiration }) })
    assert.deepEqual(result, { ok: false, reason: "TEMP_ACCESS_EXPIRED" })
  }
})
