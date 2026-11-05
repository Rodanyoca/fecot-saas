// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { hashPassword } from "../auth/password.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { generateTemporaryAccess, temporaryAccessExpiration } from "../auth/temporary-access.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { UsersDataError } from "./errors.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { UserCommands } from "./commands.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { normalizeEmail } from "./validation.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { UsersRepository } from "./repository.ts"
import type { User, UsersSheetsAdapter } from "./types.ts"

export interface FirstSuperAdminInput {
  idUser: string
  nomComplet: string
  email: string
}

export interface FirstSuperAdminDryRun {
  mode: "DRY_RUN"
  canExecute: true
  idUser: string
  nomComplet: string
  email: string
  typeUser: "ADMIN"
  estSuperAdmin: true
  doitChangerMotDePasse: true
  sessionVersion: 1
  expirationHours: 24
}

function validateInput(input: FirstSuperAdminInput): FirstSuperAdminInput {
  const idUser = input.idUser.trim()
  const nomComplet = input.nomComplet.trim()
  const email = normalizeEmail(input.email)
  if (!idUser) throw new UsersDataError("ROW_INVALID", "L'identifiant du premier super-administrateur est obligatoire.")
  if (!nomComplet) throw new UsersDataError("ROW_INVALID", "Le nom du premier super-administrateur est obligatoire.")
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new UsersDataError("ROW_INVALID", "L'adresse e-mail du premier super-administrateur est invalide.")
  return { idUser, nomComplet, email }
}

export async function dryRunFirstSuperAdmin(
  adapter: UsersSheetsAdapter,
  input: FirstSuperAdminInput
): Promise<FirstSuperAdminDryRun> {
  const normalized = validateInput(input)
  const users = await new UsersRepository(adapter).getUsers()
  if (users.length !== 0) {
    throw new UsersDataError("CONFLICT", "L'amorçage est réservé à une feuille USERS vide.")
  }
  return {
    mode: "DRY_RUN",
    canExecute: true,
    ...normalized,
    typeUser: "ADMIN",
    estSuperAdmin: true,
    doitChangerMotDePasse: true,
    sessionVersion: 1,
    expirationHours: 24,
  }
}

export async function executeFirstSuperAdmin(params: {
  adapter: UsersSheetsAdapter
  input: FirstSuperAdminInput
  now?: Date
  generateAccess?: () => string
}): Promise<{ user: User; temporaryAccess: string }> {
  const dryRun = await dryRunFirstSuperAdmin(params.adapter, params.input)
  const now = params.now ?? new Date()
  const temporaryAccess = (params.generateAccess ?? generateTemporaryAccess)()
  const passwordHash = await hashPassword(temporaryAccess)
  const user: User = {
    idUser: dryRun.idUser,
    nomComplet: dryRun.nomComplet,
    email: dryRun.email,
    passwordHash,
    typeUser: "ADMIN",
    estSuperAdmin: true,
    doitChangerMotDePasse: true,
    statut: "ACTIF",
    dateCreation: now.toISOString(),
    dateModificationMotDePasse: null,
    derniereConnexion: null,
    sessionVersion: 1,
    dateExpirationAccesTemporaire: temporaryAccessExpiration(now),
  }
  const result = await new UserCommands(params.adapter).createUser({ user })
  if (result.status !== "CREATED") {
    throw new UsersDataError("CONFLICT", "L'amorçage n'a pas créé de nouveau compte.")
  }
  return { user: result.user, temporaryAccess }
}
