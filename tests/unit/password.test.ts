import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { PasswordHashError, SCRYPT_PARAMETERS, hashPassword, verifyPassword } from "../../lib/auth/password.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { PasswordPolicyError, assertPasswordPolicy, passwordLength } from "../../lib/auth/password-policy.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { TEMPORARY_ACCESS_LENGTH, generateTemporaryAccess, temporaryAccessExpiration } from "../../lib/auth/temporary-access.ts"

test("produit des empreintes scrypt salées et vérifiables", async () => {
  const password = "une phrase de passe solide"
  const first = await hashPassword(password)
  const second = await hashPassword(password)
  assert.notEqual(first, second)
  assert.equal(await verifyPassword(password, first), true)
  assert.equal(await verifyPassword("une phrase incorrecte", first), false)
  assert.ok(first.startsWith("scrypt$v1$N=65536,r=8,p=1,l=64$"))
  assert.equal(SCRYPT_PARAMETERS.saltLength, 16)
})

test("refuse les formats et paramètres non reconnus", async () => {
  await assert.rejects(
    () => verifyPassword("une phrase de passe solide", "scrypt$v2$N=65536,r=8,p=1,l=64$sel$hash"),
    (error: unknown) => error instanceof PasswordHashError
  )
})

test("applique les bornes et la liste locale des mots de passe courants", () => {
  assert.doesNotThrow(() => assertPasswordPolicy("12345678901a"))
  assert.equal(passwordLength("🔐".repeat(12)), 12)
  for (const password of ["trop court", "a".repeat(129), "password1234"]) {
    assert.throws(
      () => assertPasswordPolicy(password),
      (error: unknown) => error instanceof PasswordPolicyError
    )
  }
})

test("génère exactement vingt caractères sans symboles ambigus", () => {
  let index = 0
  const access = generateTemporaryAccess((max) => (index++ * 7) % max)
  assert.equal(access.length, TEMPORARY_ACCESS_LENGTH)
  assert.match(access, /^[A-HJ-NP-Za-km-z2-9]{20}$/)
  assert.equal(temporaryAccessExpiration(new Date("2026-08-31T10:00:00.000Z")), "2026-09-01T10:00:00.000Z")
})
