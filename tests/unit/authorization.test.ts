import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { assertLastActiveSuperAdminProtected, authorize, authorizeWithSource, isAuthorizationActive, kinshasaCalendarDate } from "../../lib/auth/authorization.ts"
import type { User, UserAuthorization } from "../../lib/users/types.ts"

const user: User = { idUser: "USR-1", nomComplet: "Test", email: "test@example.org", passwordHash: "hash", typeUser: "ADMIN", estSuperAdmin: false, doitChangerMotDePasse: false, statut: "ACTIF", dateCreation: "2026-01-01T00:00:00+01:00", dateModificationMotDePasse: null, derniereConnexion: null, sessionVersion: 1, dateExpirationAccesTemporaire: null }
const grant: UserAuthorization = { idUserAutorisation: "UA-1", idUser: user.idUser, idBlocAutorisation: "AUT-SPT", statut: "ACTIF", dateDebut: "2026-08-01", dateFin: "2026-08-31" }
const business = { scope: "BUSINESS", blocks: ["AUT-SPT"] } as const

test("VIEWER lit un bloc attribué mais ne peut jamais l'écrire", () => {
  const viewer = { ...user, typeUser: "VIEWER" as const }
  assert.equal(authorize({ user: viewer, authorizations: [grant], requirement: business, action: "READ", date: "2026-08-15" }).allowed, true)
  assert.equal(authorize({ user: viewer, authorizations: [grant], requirement: business, action: "WRITE", date: "2026-08-15" }).reason, "READ_ONLY_PROFILE")
})

test("ADMIN écrit seulement dans un bloc explicitement attribué et actif", () => {
  assert.equal(authorize({ user, authorizations: [grant], requirement: business, action: "WRITE", date: "2026-08-15" }).allowed, true)
  assert.equal(authorize({ user, authorizations: [], requirement: business, action: "WRITE", date: "2026-08-15" }).reason, "EXPLICIT_ASSIGNMENT_REQUIRED")
  assert.equal(authorize({ user, authorizations: [{ ...grant, statut: "INACTIF" }], requirement: business, action: "READ", date: "2026-08-15" }).allowed, false)
})

test("les bornes sont inclusives selon la date civile Africa/Kinshasa", () => {
  assert.equal(kinshasaCalendarDate(new Date("2026-08-30T23:30:00Z")), "2026-08-31")
  assert.equal(isAuthorizationActive(grant, "2026-08-01"), true)
  assert.equal(isAuthorizationActive(grant, "2026-08-31"), true)
  assert.equal(isAuthorizationActive(grant, "2026-07-31"), false)
  assert.equal(isAuthorizationActive(grant, "2026-09-01"), false)
})

test("le super-administrateur accède à tous les blocs métier", () => {
  const superAdmin = { ...user, estSuperAdmin: true }
  assert.equal(authorize({ user: superAdmin, authorizations: [], requirement: { scope: "SUPER_ADMIN" }, action: "WRITE" }).allowed, true)
  assert.equal(authorize({ user: superAdmin, authorizations: [], requirement: business, action: "READ" }).allowed, true)
  assert.equal(authorize({ user: superAdmin, authorizations: [], requirement: business, action: "WRITE" }).allowed, true)
})

test("le super-administrateur reste autorisé si la source des blocs est indisponible", async () => {
  const result = await authorizeWithSource({ user: { ...user, estSuperAdmin: true }, requirement: business, action: "READ", loadAuthorizations: async () => { throw new Error("Sheets") } })
  assert.deepEqual(result, { allowed: true, reason: "ALLOWED" })
})

test("une panne de la source d'autorisation produit un refus fermé", async () => {
  const result = await authorizeWithSource({ user, requirement: business, action: "READ", loadAuthorizations: async () => { throw new Error("Sheets") } })
  assert.deepEqual(result, { allowed: false, reason: "SOURCE_UNAVAILABLE" })
})

test("le dernier super-administrateur actif ne peut pas être neutralisé", () => {
  const only = { ...user, estSuperAdmin: true }
  assert.throws(() => assertLastActiveSuperAdminProtected({ target: only, users: [only], willRemainActiveSuperAdmin: false }), /dernier super-administrateur actif/)
  assert.doesNotThrow(() => assertLastActiveSuperAdminProtected({ target: only, users: [only, { ...only, idUser: "USR-2" }], willRemainActiveSuperAdmin: false }))
})
