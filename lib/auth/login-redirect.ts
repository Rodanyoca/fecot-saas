export const LOGIN_REDIRECTS = ["/activation", "/", "/activites", "/mon-compte"] as const
export type LoginRedirect = typeof LOGIN_REDIRECTS[number]
export function normalizeLoginRedirect(value: unknown): LoginRedirect {
  return typeof value === "string" && (LOGIN_REDIRECTS as readonly string[]).includes(value) ? value as LoginRedirect : "/"
}
