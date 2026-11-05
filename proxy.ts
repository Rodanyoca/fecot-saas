import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie"
import { isPendingPasswordRouteAllowed } from "@/lib/auth/session-policy"
import { resolveSession } from "@/lib/auth/session-resolution"
import { authorizeWithSource } from "@/lib/auth/authorization"
import { routePolicy } from "@/lib/auth/route-policy"
import { isMutationOriginAllowed, publicRequestOrigin } from "@/lib/auth/request-origin"
import { getAuthorizationsForUser, getUserById } from "@/lib/users/data"
import { authenticationFailurePath } from "@/lib/auth/failure-navigation"

function deny(request: NextRequest, status = 401) {
  const response = request.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.json({ error: status === 503 ? "Service d’authentification indisponible." : status === 403 ? "Accès non autorisé." : "Session invalide." }, { status })
    : NextResponse.redirect(new URL(status === 403 ? "/acces-refuse" : authenticationFailurePath(status), publicRequestOrigin(request)))
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const assets = new Set(["/_vercel/insights/script.js", "/favicon.ico", "/logo-fecot.png", "/1120345-1920x1280-desktop-hd-taekwondo-background-photo.jpg", "/icon.svg", "/apple-icon.png", "/icon-dark-32x32.png", "/icon-light-32x32.png", "/placeholder-logo.png", "/placeholder-logo.svg", "/placeholder-user.jpg", "/placeholder.jpg", "/placeholder.svg", "/images/login/taekwondo.svg"])
  if ((path.startsWith("/_next/") || assets.has(path)) && ["GET", "HEAD"].includes(request.method)) return NextResponse.next()
  if (!isMutationOriginAllowed(request)) return deny(request, 403)
  if (["/login", "/service-indisponible", "/api/auth/login"].includes(path)) return NextResponse.next()
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) return deny(request)
  // Logout remains possible even when the data source is unavailable.
  if (path === "/api/auth/logout") return NextResponse.next()
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) return deny(request, 503)
  const resolution = await resolveSession({ token, secret, loadUser: getUserById })
  if (!resolution.ok) return deny(request, resolution.reason === "SOURCE_UNAVAILABLE" ? 503 : 401)
  if (resolution.requiresActivation && !isPendingPasswordRouteAllowed(path)) {
    if (path.startsWith("/api/")) return deny(request, 403)
    return NextResponse.redirect(new URL("/activation", publicRequestOrigin(request)))
  }
  if (isPendingPasswordRouteAllowed(path) || ["/mon-compte", "/api/auth/change-password", "/acces-refuse"].includes(path)) return NextResponse.next()
  const policy = routePolicy(path, request.method)
  if (!policy) return deny(request, 403)
  const decision = await authorizeWithSource({ user: resolution.user, requirement: policy, action: policy.action, loadAuthorizations: () => getAuthorizationsForUser(resolution.user.idUser) })
  if (!decision.allowed) return deny(request, decision.reason === "SOURCE_UNAVAILABLE" ? 503 : 403)
  const response = NextResponse.next()
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
// Every dynamic page and API is protected, including identifiers containing dots.
export const config = { matcher: ["/:path*"] }
