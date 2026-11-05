import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { dashboardSummary } from "../lib/dashboard-summary.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { actorKinds, actorConfig } from "../lib/actors/model.ts"
const emptyActors = (): Record<string, { rows: Record<string, string>[] }> => Object.fromEntries(actorKinds.map(kind => [actorConfig[kind].sheet, { rows: [] }]))
test("dashboard distinguishes empty sources from unavailable sources", () => {
  const empty = dashboardSummary({ LIGUES: { rows: [] }, ENTENTES: { rows: [] }, CLUBS: { rows: [] } }, emptyActors())
  assert.equal(empty.structureCount, 0); assert.equal(empty.actorCount, 0)
  const unavailable = dashboardSummary(null, null)
  assert.equal(unavailable.structureCount, null); assert.equal(unavailable.actorCount, null)
  assert.equal(unavailable.activeActorCount, null)
})
test("dashboard counts all six categories without personal data or unconnected modules", () => {
  const actors = emptyActors()
  actors.ATHLETES.rows = [{ statut: " actif ", nom_complet: "Synthetic private name" }, { statut: "INACTIVE" }, { statut: "inconnu" }, { statut: "" }]
  const result = dashboardSummary(null, actors)
  assert.equal(result.actorCount, 4); assert.equal(result.activeActorCount, 1)
  assert.deepEqual(result.people[0], { label: "Athlètes", href: "/athletes", total: 4, active: 1, inactive: 1, unknown: 2 })
  assert.equal(result.people.length, 6); assert.equal(result.structures.length, 3)
  assert.ok(!JSON.stringify(result).includes("Synthetic private name"))
  assert.ok(!JSON.stringify(result).includes("competitions"))
})
test("a missing sheet cannot silently become an empty category", () => {
  const actors = emptyActors(); delete actors.MEDECINS
  assert.equal(dashboardSummary(null, actors).actorCount, null)
})
