// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { SESSION_TTL_SECONDS } from "./session-token.ts"

export const SESSION_COOKIE_NAME = "fecot_session"

export function sessionCookieOptions(production: boolean) {
  return { httpOnly: true as const, secure: production, sameSite: "lax" as const, path: "/", maxAge: SESSION_TTL_SECONDS }
}
