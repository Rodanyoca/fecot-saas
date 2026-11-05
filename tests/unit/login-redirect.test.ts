import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { normalizeLoginRedirect } from "../../lib/auth/login-redirect.ts"

test("conserve toutes les destinations de connexion autorisées", () => {
  for (const destination of ["/activation", "/", "/activites", "/mon-compte"]) {
    assert.equal(normalizeLoginRedirect(destination), destination)
  }
})

test("refuse une destination injectée et conserve un repli sûr", () => {
  for (const destination of [undefined, null, "https://example.org", "/api/auth/logout"]) {
    assert.equal(normalizeLoginRedirect(destination), "/")
  }
})
