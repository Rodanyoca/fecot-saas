import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { dashboardNavigation, isNavigationItemActive } from "../lib/navigation.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { filterNavigation } from "../lib/auth/navigation-access.ts"

test("navigation preserves FEVOCO groups and separates licence routes", () => {
  assert.deepEqual(dashboardNavigation.map(item => item.name), ["Tableau de bord", "Structure territoriale", "Acteurs", "Licences", "Compétitions", "Équipes nationales", "Administration", "Paramètres"])
  const licences = dashboardNavigation.find(item => item.name === "Licences")!.children!
  assert.equal(isNavigationItemActive(licences[0], "/licences/entourage"), false)
  assert.equal(isNavigationItemActive(licences[1], "/licences/entourage"), true)
  assert.equal(isNavigationItemActive(dashboardNavigation[1], "/clubs/abc/modifier"), true)
})

test("navigation enforces grants and removes empty groups", () => {
  assert.deepEqual(filterNavigation(dashboardNavigation, null), [])
  assert.deepEqual(filterNavigation(dashboardNavigation, { estSuperAdmin: false, access: {} }), [])
  const sport = filterNavigation(dashboardNavigation, { estSuperAdmin: false, access: { "AUT-SPT:READ": true } })
  assert.equal(sport.some(item => item.name === "Administration" || item.name === "Paramètres"), false)
  assert.deepEqual(filterNavigation(dashboardNavigation, { estSuperAdmin: false, access: { "AUT-ADM:READ": true } }).map(item => item.name), ["Administration"])
  assert.equal(filterNavigation(dashboardNavigation, { estSuperAdmin: true, access: {} }).length, dashboardNavigation.length)
})
