import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { validateLogoData } from "../lib/club-media-validation.ts"
test("logos accept the supported signatures and reject false MIME types or oversized files", () => {
  const png = Uint8Array.from([137,80,78,71,13,10,26,10])
  assert.equal(validateLogoData("image/png", png.length, png), "png")
  assert.throws(() => validateLogoData("image/jpeg", png.length, png))
  assert.throws(() => validateLogoData("image/svg+xml", png.length, png))
  assert.throws(() => validateLogoData("image/png", 6 * 1024 * 1024, png))
  assert.throws(() => validateLogoData("image/png", 0, new Uint8Array()))
})
