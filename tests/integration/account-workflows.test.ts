import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { activateAccount, changeOwnPassword, resetUserAccess } from "../../lib/auth/account-workflows.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { hashPassword, verifyPassword } from "../../lib/auth/password.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { AUDIT_LOG_HEADERS, AUDIT_LOG_SHEET, AUTH_ATTEMPT_HEADERS, AUTH_ATTEMPTS_SHEET, USER_AUTHORIZATION_HEADERS, USER_AUTHORIZATIONS_SHEET, USER_HEADERS, USERS_SHEET, type SheetRow, type User, type UsersSheetsAdapter } from "../../lib/users/types.ts"

class MemoryAdapter implements UsersSheetsAdapter {
  rows: Record<string, SheetRow[]> = { [USERS_SHEET]: [], [USER_AUTHORIZATIONS_SHEET]: [], [AUTH_ATTEMPTS_SHEET]: [], [AUDIT_LOG_SHEET]: [] }
  headers: Record<string, string[]> = { [USERS_SHEET]: [...USER_HEADERS], [USER_AUTHORIZATIONS_SHEET]: [...USER_AUTHORIZATION_HEADERS], [AUTH_ATTEMPTS_SHEET]: [...AUTH_ATTEMPT_HEADERS], [AUDIT_LOG_SHEET]: [...AUDIT_LOG_HEADERS] }
  async readHeaders(sheet: string) { return this.headers[sheet] }
  async readRows(sheet: string) { return this.rows[sheet].map((row) => ({ ...row })) }
  async appendRow(sheet: string, row: SheetRow) { this.rows[sheet].push({ ...row }) }
  async updateRow(sheet: string, idColumn: string, idValue: string, row: SheetRow) { const index = this.rows[sheet].findIndex((item) => item[idColumn] === idValue); if (index < 0) throw new Error("absent"); this.rows[sheet][index] = { ...row } }
}

function row(user: User): SheetRow { return { id_user: user.idUser, nom_complet: user.nomComplet, email: user.email, password_hash: user.passwordHash, type_user: user.typeUser, est_super_admin: user.estSuperAdmin ? "TRUE" : "FALSE", doit_changer_mot_de_passe: user.doitChangerMotDePasse ? "TRUE" : "FALSE", statut: user.statut, date_creation: user.dateCreation, date_modification_mot_de_passe: user.dateModificationMotDePasse ?? "", derniere_connexion: user.derniereConnexion ?? "", session_version: String(user.sessionVersion), date_expiration_acces_temporaire: user.dateExpirationAccesTemporaire ?? "" } }

test("activation, changement volontaire et réinitialisation révoquent les versions précédentes", async () => {
  const adapter = new MemoryAdapter(), now = new Date("2026-08-31T10:00:00Z"), temporary = "Temporaire-Sur-2026", permanent = "Phrase permanente 2026", replacement = "Phrase remplacée 2027"
  const initial: User = { idUser: "USR-1", nomComplet: "Test", email: "test@example.org", passwordHash: await hashPassword(temporary), typeUser: "ADMIN", estSuperAdmin: true, doitChangerMotDePasse: true, statut: "ACTIF", dateCreation: now.toISOString(), dateModificationMotDePasse: null, derniereConnexion: null, sessionVersion: 1, dateExpirationAccesTemporaire: new Date(now.getTime() + 86_400_000).toISOString() }
  adapter.rows[USERS_SHEET] = [row(initial)]
  const activated = await activateAccount({ adapter, user: initial, temporaryAccess: temporary, newPassword: permanent, now })
  assert.equal(activated.sessionVersion, 2); assert.equal(activated.doitChangerMotDePasse, false); assert.equal(activated.dateExpirationAccesTemporaire, null); assert.equal(await verifyPassword(permanent, activated.passwordHash), true)
  const changed = await changeOwnPassword({ adapter, user: activated, currentPassword: permanent, newPassword: replacement, now: new Date(now.getTime() + 1000) })
  assert.equal(changed.sessionVersion, 3); assert.equal(await verifyPassword(permanent, changed.passwordHash), false)
  const reset = await resetUserAccess({ adapter, target: changed, actorId: changed.idUser, now, generateAccess: () => "Nouvel-Acces-Temp-28" })
  assert.equal(reset.user.sessionVersion, 4); assert.equal(reset.user.doitChangerMotDePasse, true); assert.equal(await verifyPassword(replacement, reset.user.passwordHash), false); assert.equal(adapter.rows[AUDIT_LOG_SHEET].length, 3)
})

test("refuse accès temporaire expiré, incorrect et confirmation déjà consommée", async () => {
  const adapter = new MemoryAdapter(), secret = "Temporaire-Sur-2026", now = new Date("2026-08-31T10:00:00Z")
  const user: User = { idUser: "USR-2", nomComplet: "Test", email: "two@example.org", passwordHash: await hashPassword(secret), typeUser: "VIEWER", estSuperAdmin: false, doitChangerMotDePasse: true, statut: "ACTIF", dateCreation: now.toISOString(), dateModificationMotDePasse: null, derniereConnexion: null, sessionVersion: 1, dateExpirationAccesTemporaire: new Date(now.getTime() - 1).toISOString() }
  adapter.rows[USERS_SHEET] = [row(user)]
  await assert.rejects(() => activateAccount({ adapter, user, temporaryAccess: secret, newPassword: "Phrase permanente 2026", now }), /Accès invalide/)
  await assert.rejects(() => activateAccount({ adapter, user: { ...user, dateExpirationAccesTemporaire: new Date(now.getTime() + 1000).toISOString() }, temporaryAccess: "incorrect-access-2026", newPassword: "Phrase permanente 2026", now }), /Accès invalide/)
  await assert.rejects(() => activateAccount({ adapter, user: { ...user, doitChangerMotDePasse: false }, temporaryAccess: secret, newPassword: "Phrase permanente 2026", now }), /Accès invalide/)
})
