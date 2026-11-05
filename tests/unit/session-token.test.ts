import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { createSessionToken, SESSION_TTL_SECONDS, verifySessionToken } from "../../lib/auth/session-token.ts"

const secret = "test-secret-that-is-not-used-in-production"
const now = 2_000_000_000

test("crée un jeton strict valable exactement huit heures", async () => {
  const token = await createSessionToken({ idUser: "USR-1", sessionVersion: 3, secret, nowSeconds: now })
  const payload = await verifySessionToken({ token, secret, nowSeconds: now })
  assert.deepEqual(payload, { id_user: "USR-1", session_version: 3, iat: now, exp: now + SESSION_TTL_SECONDS })
})

test("refuse le jeton à l'instant exact de son expiration", async () => {
  const token = await createSessionToken({ idUser: "USR-1", sessionVersion: 1, secret, nowSeconds: now })
  assert.ok(await verifySessionToken({ token, secret, nowSeconds: now + SESSION_TTL_SECONDS - 1 }))
  assert.equal(await verifySessionToken({ token, secret, nowSeconds: now + SESSION_TTL_SECONDS }), null)
})

test("refuse un jeton altéré", async () => {
  const token = await createSessionToken({ idUser: "USR-1", sessionVersion: 1, secret, nowSeconds: now })
  const [data, signature] = token.split(".")
  const altered = `${data[0] === "A" ? "B" : "A"}${data.slice(1)}.${signature}`
  assert.equal(await verifySessionToken({ token: altered, secret, nowSeconds: now }), null)
})

test("refuse un ancien payload coc/technique même correctement signé", async () => {
  const legacy = { id: "USR-1", nom: "Test", email: "test@example.org", role: "coc", exp: now + SESSION_TTL_SECONDS }
  const bytes = new TextEncoder().encode(JSON.stringify(legacy))
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes))
  const encode = (value: Uint8Array) => Buffer.from(value).toString("base64url")
  assert.equal(await verifySessionToken({ token: `${encode(bytes)}.${encode(signature)}`, secret, nowSeconds: now }), null)
})
