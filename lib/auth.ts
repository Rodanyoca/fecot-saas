import "server-only"

import { cookies } from "next/headers"
import { getAuthorizationsForUser, getUserById } from "@/lib/users/data"
import { authorize, type AuthorizationAction } from "@/lib/auth/authorization"
import type { AuthorizationBlock } from "@/lib/users/types"
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/session-cookie"
import { resolveSession } from "@/lib/auth/session-resolution"
import { createSessionToken } from "@/lib/auth/session-token"

type NewSessionInput = { idUser: string; sessionVersion: number }

function getSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is not defined in environment variables")
  return secret
}

export async function createSession(input: NewSessionInput) {
  const token = await createSessionToken({ ...input, secret: getSecret() })
  const jar = await cookies()
  jar.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(process.env.NODE_ENV === "production"))
}

export async function destroySession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE_NAME)
}

export async function getSession() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  const resolution = await resolveSession({ token, secret: getSecret(), loadUser: getUserById })
  if (!resolution.ok) return null
  const { user, payload } = resolution
  return {
    id: user.idUser,
    nom: user.nomComplet,
    email: user.email,
    idUser: user.idUser,
    typeUser: user.typeUser,
    estSuperAdmin: user.estSuperAdmin,
    statut: user.statut,
    sessionVersion: payload.session_version,
    iat: payload.iat,
    exp: payload.exp,
    doitChangerMotDePasse: user.doitChangerMotDePasse,
  }
}

type ResolvedSession = NonNullable<Awaited<ReturnType<typeof getSession>>>

export async function canAccess(block: AuthorizationBlock, action: AuthorizationAction): Promise<boolean> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE_NAME)?.value
  if (!token) return false
  const resolution = await resolveSession({ token, secret: getSecret(), loadUser: getUserById })
  if (!resolution.ok || resolution.requiresActivation) return false
  try {
    const authorizations = await getAuthorizationsForUser(resolution.user.idUser)
    return authorize({ user: resolution.user, authorizations, requirement: { scope: "BUSINESS", blocks: [block] }, action }).allowed
  } catch {
    return false
  }
}

export async function getNavigationAccess(currentSession?: ResolvedSession) {
  const session = currentSession ?? await getSession()
  const blocks = ["AUT-ADM", "AUT-SPT", "AUT-COM"] as const
  const actions = ["READ", "WRITE"] as const
  if (session?.estSuperAdmin) {
    return Object.fromEntries((blocks.flatMap((block) =>
      actions.map((action) => [`${block}:${action}`, true] as const)
    ))) as Record<`${AuthorizationBlock}:${AuthorizationAction}`, boolean>
  }
  if (!session) return Object.fromEntries(blocks.flatMap((block) => actions.map((action) => [`${block}:${action}`, false]))) as Record<`${AuthorizationBlock}:${AuthorizationAction}`, boolean>
  try {
    const authorizations = await getAuthorizationsForUser(session.idUser)
    return Object.fromEntries(blocks.flatMap((block) => actions.map((action) => [
      `${block}:${action}`,
      authorize({ user: { idUser: session.idUser, typeUser: session.typeUser, estSuperAdmin: session.estSuperAdmin }, authorizations, requirement: { scope: "BUSINESS", blocks: [block] }, action }).allowed,
    ]))) as Record<`${AuthorizationBlock}:${AuthorizationAction}`, boolean>
  } catch {
    return Object.fromEntries(blocks.flatMap((block) => actions.map((action) => [`${block}:${action}`, false]))) as Record<`${AuthorizationBlock}:${AuthorizationAction}`, boolean>
  }
}
