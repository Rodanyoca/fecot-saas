import "server-only"
import { createGoogleUsersSheetsAdapter, readUsersTables } from "./google-adapter"
import { UsersRepository } from "./repository"
import { AUTH_ATTEMPTS_SHEET, USERS_SHEET, USER_AUTHORIZATIONS_SHEET } from "./types"

function repository() { return new UsersRepository(createGoogleUsersSheetsAdapter()) }
export async function getTypedUsers() { return repository().getUsers() }
export async function getUserById(id: string) { return repository().getUserById(id) }
export async function getUserByEmail(email: string) { return repository().getUserByEmail(email) }
export async function getUserAuthorizations() { return repository().getUserAuthorizations() }
export async function getAuthorizationsForUser(id: string) { return repository().getAuthorizationsForUser(id) }
export async function getAuthAttempts() { return repository().getAuthAttempts() }
export async function getAuditLog() { return repository().getAuditLog() }
export async function getAuthenticationSnapshot(email: string) {
  const tables = await readUsersTables([USERS_SHEET, AUTH_ATTEMPTS_SHEET, USER_AUTHORIZATIONS_SHEET])
  const adapter = createGoogleUsersSheetsAdapter(tables)
  const repo = new UsersRepository(adapter)
  const [user, attempts, authorizations] = await Promise.all([repo.getUserByEmail(email), repo.getAuthAttempts(), repo.getUserAuthorizations()])
  return { user, attempts, authorizations: authorizations.filter(item => item.idUser === user?.idUser), adapter }
}
