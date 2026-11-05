import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { affiliationsFixture } from "./affiliations-fixture.ts"
test("affiliations: fresh READ/WRITE permissions precede sources, no stale rights fallback", async () => {
 const f = await affiliationsFixture()
 f.state.loggedIn = false; assert.equal((await f.readAffiliations()).status, 401); assert.equal((await f.writeAffiliation(f.affiliationInput)).status, 401)
 f.state.loggedIn = true; f.state.canRead = false; f.state.canWrite = false
 assert.equal((await f.readAffiliations()).status, 403); assert.equal((await f.writeAffiliation(f.affiliationInput)).status, 403)
 f.state.failSecurity = true; assert.equal((await f.readAffiliations()).status, 503)
 assert.equal(f.state.reads.length, 0); assert.equal(f.state.writes.length, 0)
})
test("athlete linked directly to club: create, idempotency, versioned update, immutable ID and other columns", async () => {
 const f = await affiliationsFixture(); await f.write()
 assert.deepEqual((await (await f.readAffiliations()).json()).affiliations, [])
 const response = await f.writeAffiliation(f.affiliationInput); assert.equal(response.status, 201)
 const item = (await response.json()).affiliation
 assert.equal(item.id, "AFA-000001"); assert.equal(item.target, "Club Test Alpha"); assert.equal(item.values.id_club, "C001"); assert.ok(!("id_equipe" in item.values))
 const writes = f.state.writes.length
 assert.equal((await (await f.writeAffiliation(f.affiliationInput)).json()).affiliation.id, item.id); assert.equal(f.state.writes.length, writes)
 const row = f.state.books.AFF.ATHLETE_AFFILIATIONS[1]; row[row.length - 1] = "Preserved history"
 f.api.invalidateActorSource()
 const latest = (await (await f.readAffiliations()).json()).affiliations[0]
 const updated = await f.writeAffiliation({ ...f.affiliationInput, date_fin: "31/12/2026", id_statut_affiliation: "TEST-END", version: latest.version }, "athletes", "ATH00001", item.id)
 assert.equal(updated.status, 200); assert.equal(row[row.length - 1], "Preserved history")
 assert.equal((await f.writeAffiliation({ ...f.affiliationInput, version: item.version }, "athletes", "ATH00001", item.id)).status, 409)
 assert.equal((await f.writeAffiliation({ ...f.affiliationInput, id_athlete: "OTHER" })).status, 422)
 assert.equal((await f.writeAffiliation({ ...f.affiliationInput, id_equipe: "BASKET" })).status, 422)
})
test("affiliations: unknown actor, club, status, invalid dates, empty references and Google failure", async () => {
 const f = await affiliationsFixture(); await f.write()
 assert.equal((await f.readAffiliations("athletes", "unknown")).status, 404)
 assert.equal((await f.readAffiliations("arbitres")).status, 404)
 for (const change of [{ id_club: "unknown" }, { id_statut_affiliation: "SAF001" }, { date_debut: "2026-02-30" }, { date_fin: "2025-12-31" }, { id_statut_affiliation: "TEST-END" }]) assert.equal((await f.writeAffiliation({ ...f.affiliationInput, ...change })).status, 422)
 f.state.books.REFS.STATUTS_AFFILIATION = [["id_statut_affiliation", "nom_statut_affiliation"]]
 f.api.invalidateActorSource(); const options = (await (await f.readAffiliations("athletes", "ATH00001", true)).json()).options
 assert.equal(options.statuses.length, 0); assert.ok(options.issues.length)
 assert.equal((await f.writeAffiliation(f.affiliationInput)).status, 422)
 f.state.failRead = "AFF"; f.api.invalidateActorSource(); assert.equal((await f.readAffiliations()).status, 503)
})
test("single athlete club across overlapping periods, boundaries and local concurrent creates", async () => {
 const f = await affiliationsFixture(); await f.write()
 const responses = await Promise.all([f.writeAffiliation(f.affiliationInput), f.writeAffiliation({ ...f.affiliationInput, id_club: "C002" })])
 assert.deepEqual(responses.map(r => r.status), [201, 409])
 const item = (await responses[0].json()).affiliation
 await f.writeAffiliation({ ...item.values, date_fin: "2026-06-30", id_statut_affiliation: "TEST-END", version: item.version }, "athletes", "ATH00001", item.id)
 assert.equal((await f.writeAffiliation({ ...f.affiliationInput, id_club: "C002", date_debut: "2026-06-30" })).status, 409)
 assert.equal((await f.writeAffiliation({ ...f.affiliationInput, id_club: "C002", date_debut: "2026-07-01" })).status, 201)
 assert.equal((await (await f.readAffiliations()).json()).affiliations.length, 2)
})
test("affiliation ownership, fresh reference validation, source schema and uncertain confirmation", async () => {
 const f = await affiliationsFixture(); await f.write(); await f.write("athletes", { ...f.input, nom_complet: "Other synthetic actor" })
 const item = (await (await f.writeAffiliation(f.affiliationInput)).json()).affiliation
 assert.equal((await f.writeAffiliation({ ...item.values, version: item.version }, "athletes", "ATH00002", item.id)).status, 404)
 assert.deepEqual((await (await f.readAffiliations("athletes", "ATH00002")).json()).affiliations, [])
 f.state.books.STRUCTURE.CLUBS.pop()
 assert.equal((await f.writeAffiliation({ ...f.affiliationInput, id_club: "C002" })).status, 422)
 f.state.failConfirm = true; f.state.wrote = false
 const uncertain = await f.writeAffiliation({ ...item.values, date_fin: "2026-12-31", version: item.version }, "athletes", "ATH00001", item.id)
 assert.equal(uncertain.status, 503); assert.equal((await uncertain.json()).error.uncertain, true)
 assert.equal(f.state.driveReads.length, 0)
})
test("coach, doctor, official and other actors respect their distinct FECOT physical schemas", async () => {
 const f = await affiliationsFixture()
 for (const [kind, actorId] of [["coachs", "COA-0001"], ["medecins", "MED0001"], ["officiels", "OFF0001"], ["autres-acteurs", "AUT0001"]] as const) {
  await f.write(kind)
  const body = kind === "officiels" ? { date_debut: "2026-01-01", date_fin: "", observations: "", id_type_entite: "TEST-LIG", id_entite: "01", id_fonction: "TEST-FON", id_statut_affiliation: "TEST-ACT" } : kind === "autres-acteurs" ? { date_debut: "2026-01-01", date_fin: "", observations: "", id_type_entite: "TEST-CLUB", id_entite: "C001", id_saison: "TEST-SAI", statut_affiliation: "Active" } : f.affiliationInput
  const response = await f.writeAffiliation(body, kind, actorId); assert.equal(response.status, 201, JSON.stringify(await response.clone().json()))
  assert.equal((await (await f.readAffiliations(kind, actorId)).json()).affiliations.length, 1)
 }
})
test("historical IDs remain stable, malformed history and schema fail closed", async () => {
 const f = await affiliationsFixture(); await f.write()
 const table = f.state.books.AFF.ATHLETE_AFFILIATIONS, headers = table[0] as string[]
 table.push(headers.map(key => key === "id_affiliation_athlete" ? "LEGACY-ID" : key === "id_athlete" ? "ATH00001" : f.affiliationInput[key as keyof typeof f.affiliationInput] || ""))
 const item = (await (await f.readAffiliations()).json()).affiliations[0]
 assert.equal(item.id, "LEGACY-ID")
 const edited = await f.writeAffiliation({ ...item.values, date_fin: "2026-12-31", version: item.version }, "athletes", "ATH00001", item.id)
 assert.equal(edited.status, 200); assert.equal((await edited.json()).affiliation.id, "LEGACY-ID")
 table[1][headers.indexOf("date_debut")] = "not-a-date"
 assert.equal((await f.writeAffiliation({ ...f.affiliationInput, date_debut: "2027-01-01" })).status, 409)
 table[0][headers.indexOf("id_club")] = "id_equipe"; f.api.invalidateActorSource()
 assert.equal((await f.readAffiliations()).status, 503)
})
test("options are grouped, compatible in-flight reads shared, but rights remain fresh", async () => {
 const f = await affiliationsFixture(); await f.write(); f.api.invalidateActorSource(); f.state.reads.splice(0)
 const [a, b] = await Promise.all([f.readAffiliations("athletes", "ATH00001", true), f.readAffiliations("athletes", "ATH00001", true)])
 assert.equal(a.status, 200); assert.equal(b.status, 200)
 assert.equal(f.state.reads.filter(r => r.startsWith("STRUCTURE:")).length, 1)
 assert.equal(f.state.reads.filter(r => r.startsWith("REFS:")).length, 1)
 f.state.canRead = false; const count = f.state.reads.length
 assert.equal((await f.readAffiliations()).status, 403); assert.equal(f.state.reads.length, count)
})
test("territorial mutation expires only territorial options, preserving reference cache", async () => {
 const f = await affiliationsFixture(); await f.write()
 await f.readAffiliations("athletes", "ATH00001", true)
 const refCalls = f.state.reads.filter(r => r.startsWith("REFS:")).length
 f.state.books.STRUCTURE.CLUBS.pop(); f.api.invalidateActorTerritorySource()
 const options = (await (await f.readAffiliations("athletes", "ATH00001", true)).json()).options
 assert.equal(options.clubs.length, 1)
 assert.equal(f.state.reads.filter(r => r.startsWith("REFS:")).length, refCalls)
})
test("editor bootstrap returns history and references with a single actor check and grouped reads", async () => {
 const f = await affiliationsFixture(); await f.write(); f.api.invalidateActorSource(); f.state.reads.splice(0)
 const response = await f.api.affiliationsGet("athletes", "ATH00001", new Request("http://offline.invalid/api/affiliations/athletes/ATH00001?editor=1"))
 assert.equal(response.status, 200)
 const data = await response.json(); assert.deepEqual(data.affiliations, []); assert.equal(data.options.clubs[0].id, "C001")
 assert.equal(f.state.reads.filter(r => r.startsWith("ACTORS:")).length, 1)
 assert.equal(f.state.reads.filter(r => r.startsWith("AFF:")).length, 1)
 assert.equal(f.state.reads.filter(r => r.startsWith("REFS:")).length, 1)
 assert.equal(f.state.reads.filter(r => r.startsWith("STRUCTURE:")).length, 1)
 f.state.canRead = false; const reads = f.state.reads.length
 assert.equal((await f.api.affiliationsGet("athletes", "ATH00001", new Request("http://offline.invalid/api/affiliations/athletes/ATH00001?editor=1"))).status, 403)
 assert.equal(f.state.reads.length, reads)
})
