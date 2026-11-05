import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { routePolicy } from "../lib/auth/route-policy.ts"
test("territorial pages and logo routes belong to the sporting block with write mutations", () => {
  for (const path of ["/dashboard", "/ligues", "/ententes", "/clubs", "/api/club-logos/file.id"]) {
    const policy = routePolicy(path)
    assert.equal(policy?.scope, "BUSINESS")
    assert.equal(policy?.action, "READ")
    if (policy?.scope === "BUSINESS") assert.deepEqual(policy.blocks, ["AUT-SPT"])
  }
  for (const path of ["/api/ligues", "/api/ententes/id", "/api/clubs/id/logo"]) assert.equal(routePolicy(path, "POST")?.action, "WRITE")
  assert.equal(routePolicy("/unconfigured-route"), null)
})
