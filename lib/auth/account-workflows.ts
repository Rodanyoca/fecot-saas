import { randomUUID } from "node:crypto"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { hashPassword, verifyPassword } from "./password.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { generateTemporaryAccess, temporaryAccessExpiration } from "./temporary-access.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { UserCommands } from "../users/commands.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { UsersRepository } from "../users/repository.ts"
import type { AuditLogEntry, User, UsersSheetsAdapter } from "../users/types.ts"

type Context = { adapter: UsersSheetsAdapter; now?: Date; requestId?: string }

async function audit(adapter: UsersSheetsAdapter, actorId: string, targetId: string, action: string, result: "SUCCES" | "ECHEC", requestId: string = randomUUID()) {
  const entry: AuditLogEntry = { idOperation: `AUD-${randomUUID()}`, idUser: actorId, action, typeObjet: "USER", idObjet: targetId, dateOperation: new Date().toISOString(), resultat: result, requestId, detailsNonSensibles: "{}" }
  await new UsersRepository(adapter).appendAuditLog(entry)
}

async function changeSecret(context: Context & { user: User; newPassword: string; action: string }): Promise<User> {
  const now = context.now ?? new Date()
  const updated = await new UserCommands(context.adapter).replaceUser({ ...context.user, passwordHash: await hashPassword(context.newPassword), doitChangerMotDePasse: false, dateExpirationAccesTemporaire: null, dateModificationMotDePasse: now.toISOString(), derniereConnexion: now.toISOString(), sessionVersion: context.user.sessionVersion + 1 })
  try { await audit(context.adapter, updated.idUser, updated.idUser, context.action, "SUCCES", context.requestId) }
  catch (error) { await new UserCommands(context.adapter).replaceUser(context.user).catch(() => undefined); throw error }
  return updated
}

export async function activateAccount(context: Context & { user: User; temporaryAccess: string; newPassword: string }): Promise<User> {
  try { const now = context.now ?? new Date(); if (!context.user.doitChangerMotDePasse || !context.user.dateExpirationAccesTemporaire || Date.parse(context.user.dateExpirationAccesTemporaire) <= now.getTime()) throw new Error("Accès invalide."); if (!(await verifyPassword(context.temporaryAccess, context.user.passwordHash))) throw new Error("Accès invalide."); if (context.temporaryAccess === context.newPassword) throw new Error("Le nouveau mot de passe doit être différent de l’accès temporaire."); return await changeSecret({ ...context, now, action: "ACTIVATION_COMPTE" }) }
  catch (error) { await audit(context.adapter, context.user.idUser, context.user.idUser, "ACTIVATION_COMPTE", "ECHEC", context.requestId).catch(() => undefined); throw error }
}

export async function changeOwnPassword(context: Context & { user: User; currentPassword: string; newPassword: string }): Promise<User> {
  try { if (!(await verifyPassword(context.currentPassword, context.user.passwordHash))) throw new Error("Accès invalide."); if (context.currentPassword === context.newPassword) throw new Error("Le nouveau mot de passe doit être différent."); return await changeSecret({ ...context, action: "CHANGEMENT_MOT_DE_PASSE" }) }
  catch (error) { await audit(context.adapter, context.user.idUser, context.user.idUser, "CHANGEMENT_MOT_DE_PASSE", "ECHEC", context.requestId).catch(() => undefined); throw error }
}

export async function resetUserAccess(context: Context & { target: User; actorId: string; generateAccess?: () => string }): Promise<{ user: User; temporaryAccess: string | null; alreadyProcessed: boolean }> {
  if (context.requestId && (await new UsersRepository(context.adapter).getAuditLog()).some((entry) => entry.requestId === context.requestId)) return { user: context.target, temporaryAccess: null, alreadyProcessed: true }
  const now = context.now ?? new Date()
  const temporaryAccess = (context.generateAccess ?? generateTemporaryAccess)()
  const user = await new UserCommands(context.adapter).replaceUser({ ...context.target, passwordHash: await hashPassword(temporaryAccess), doitChangerMotDePasse: true, dateExpirationAccesTemporaire: temporaryAccessExpiration(now), dateModificationMotDePasse: now.toISOString(), sessionVersion: context.target.sessionVersion + 1 })
  try { await audit(context.adapter, context.actorId, context.target.idUser, "REINITIALISATION_ACCES", "SUCCES", context.requestId) }
  catch (error) { await new UserCommands(context.adapter).replaceUser(context.target).catch(() => undefined); throw error }
  return { user, temporaryAccess, alreadyProcessed: false }
}
