type ApiOptions = RequestInit & { timeoutMs?: number }
export function apiErrorMessage(response: Pick<Response, "status">, payload: unknown, fallback: string) {
  const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {}
  const error = body.error
  const message = typeof error === "string" ? error : error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : fallback
  return `${message || fallback} (HTTP ${response.status})`
}
export async function readApiJson(response: Response) {
  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase()
  const message = `Réponse du service indisponible ou invalide (HTTP ${response.status}). Réessayez après actualisation.`
  if (contentType !== "application/json" && !contentType.endsWith("+json")) throw new Error(message)
  try { return await response.json() } catch { throw new Error(message) }
}
export async function apiFetch(input: RequestInfo | URL, options: ApiOptions = {}): Promise<Response> {
  const { timeoutMs = 30000, ...init } = options
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  return fetch(input, { ...init, credentials: "same-origin", cache: "no-store", signal })
}
