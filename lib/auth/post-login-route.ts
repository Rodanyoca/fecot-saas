// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { isAuthorizationActive } from "./authorization.ts"
import type { LoginRedirect } from "./login-redirect.ts"
import type { User, UserAuthorization } from "../users/types.ts"
export function postLoginRoute(user: User, authorizations: readonly UserAuthorization[], date?: string): LoginRedirect {
  if (user.doitChangerMotDePasse) return "/activation"
  if (user.estSuperAdmin) return "/"
  const active = authorizations.filter(item => item.idUser === user.idUser && isAuthorizationActive(item, date))
  if (active.some(item => item.idBlocAutorisation === "AUT-SPT")) return "/"
  if (active.some(item => item.idBlocAutorisation === "AUT-ADM")) return "/mon-compte"
  return "/mon-compte"
}
