import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { authorize } from "../../lib/auth/authorization.ts"
import type { AuthorizationBlock, User, UserAuthorization } from "../../lib/users/types.ts"

const blocks: AuthorizationBlock[] = ["AUT-ADM", "AUT-SPT", "AUT-COM"]
const base: User = { idUser: "USR-MATRIX", nomComplet: "Profil simulé", email: "matrix@example.invalid", passwordHash: "empreinte-synthetique", typeUser: "ADMIN", estSuperAdmin: false, doitChangerMotDePasse: false, statut: "ACTIF", dateCreation: "2026-09-01T00:00:00.000Z", dateModificationMotDePasse: null, derniereConnexion: null, sessionVersion: 1, dateExpirationAccesTemporaire: null }
const grant = (block: AuthorizationBlock, overrides: Partial<UserAuthorization> = {}): UserAuthorization => ({ idUserAutorisation: `UA-${block}`, idUser: base.idUser, idBlocAutorisation: block, statut: "ACTIF", dateDebut: "2026-09-01", dateFin: "2026-09-30", ...overrides })

for (const block of blocks) {
  test(`${block}: VIEWER lit avec attribution mais n'écrit jamais`, () => {
    const user = { ...base, typeUser: "VIEWER" as const }
    assert.equal(authorize({ user, authorizations: [grant(block)], requirement: { scope: "BUSINESS", blocks: [block] }, action: "READ", date: "2026-09-15" }).allowed, true)
    assert.equal(authorize({ user, authorizations: [grant(block)], requirement: { scope: "BUSINESS", blocks: [block] }, action: "WRITE", date: "2026-09-15" }).allowed, false)
  })
  test(`${block}: ADMIN écrit uniquement avec attribution active dans la période`, () => {
    const requirement = { scope: "BUSINESS", blocks: [block] } as const
    assert.equal(authorize({ user: base, authorizations: [grant(block)], requirement, action: "WRITE", date: "2026-09-15" }).allowed, true)
    for (const authorizations of [[], [grant(block, { statut: "INACTIF" })], [grant(block, { dateDebut: "2026-10-01" })], [grant(block, { dateFin: "2026-08-31" })]]) assert.equal(authorize({ user: base, authorizations, requirement, action: "WRITE", date: "2026-09-15" }).allowed, false)
  })
  test(`${block}: la super-administration accorde un accès métier complet`, () => {
    assert.equal(authorize({ user: { ...base, estSuperAdmin: true }, authorizations: [], requirement: { scope: "BUSINESS", blocks: [block] }, action: "READ", date: "2026-09-15" }).allowed, true)
    assert.equal(authorize({ user: { ...base, estSuperAdmin: true }, authorizations: [], requirement: { scope: "BUSINESS", blocks: [block] }, action: "WRITE", date: "2026-09-15" }).allowed, true)
  })
}

test("seul le super-administrateur accède au périmètre réservé", () => {
  assert.equal(authorize({ user: base, authorizations: blocks.map((block) => grant(block)), requirement: { scope: "SUPER_ADMIN" }, action: "WRITE" }).allowed, false)
  assert.equal(authorize({ user: { ...base, estSuperAdmin: true }, authorizations: [], requirement: { scope: "SUPER_ADMIN" }, action: "WRITE" }).allowed, true)
})
