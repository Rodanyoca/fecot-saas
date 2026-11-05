export function authenticationFailurePath(status: number) {
  return status === 503 ? "/service-indisponible" : "/login"
}
