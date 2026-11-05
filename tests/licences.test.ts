import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { licencesFixture } from "./licences-fixture.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { effectiveStatus, nextLicenceId } from "../lib/licences/model.ts"

test("season reference: closed history stays readable but new issues and bulk renewal are refused", async () => {
 const f = await licencesFixture(); await f.seedAthlete(); assert.equal((await f.writeLicence(f.athleteInput)).status,201)
 const season=f.state.books.REFS.SAISON; season[1][4]="TEST-SCLOSED";f.api.invalidateActorSource()
 const data=await (await f.readLicences()).json()
 assert.equal(data.rows[0].effective,"CLOTUREE")
 assert.equal(data.references.seasons.find((s:{id:string})=>s.id==="S26").issuable,false)
 const before=f.state.writes.length
 assert.equal((await f.writeLicence({...f.athleteInput,numero_licence:"OTHER"})).status,422)
 assert.equal(f.state.writes.length,before)
 const existing=data.rows[0]
 assert.equal((await f.writeLicence({...existing.values,observations:"Historical correction",version:existing.version},"athletes","PUT",`?id=${existing.id}`)).status,200)
 season[2][4]="TEST-SSUSP";f.api.invalidateActorSource()
 assert.equal((await f.writeLicence({id_club:"C001",id_saison:"S27",id_affiliations_athletes:["AFA-000001"],date_delivrance:"2027-01-01",id_statut_licence:"TEST-LACT"},"athletes","POST","?mode=club")).status,422)
})

test("season reference: planned issue allowed, unknown/disabled/ambiguous statuses and dates fail closed", async () => {
 const f=await licencesFixture();await f.seedAthlete()
 const season=f.state.books.REFS.SAISON,statuses=f.state.books.REFS.STATUTS_SAISON
 for(const code of ["UNKNOWN","TEST-SSUSP","TEST-SCANCEL"]){season[1][4]=code;f.api.invalidateActorSource();assert.equal((await f.writeLicence(f.athleteInput)).status,422)}
 season[1][4]="TEST-SACTIVE";statuses[1][3]="INACTIF";f.api.invalidateActorSource();assert.equal((await f.writeLicence(f.athleteInput)).status,422)
 statuses[1][3]="ACTIF";statuses.push([...statuses[1]]);f.api.invalidateActorSource();assert.equal((await f.writeLicence(f.athleteInput)).status,503);statuses.pop()
 season.push([...season[1]]);f.api.invalidateActorSource();assert.equal((await f.writeLicence(f.athleteInput)).status,503);season.pop()
 season[1][3]="2025-12-31";f.api.invalidateActorSource();assert.equal((await f.writeLicence(f.athleteInput)).status,422)
 assert.equal((await f.writeLicence({...f.athleteInput,id_saison:"S27",date_delivrance:"2026-11-04"})).status,201)
})

test("season reference: active default independent of sheet order, all seasons retained and missing source stays an error", async () => {
 const f=await licencesFixture();const seasons=f.state.books.REFS.SAISON
 seasons.splice(1,0,["SOLD","1982","1982-01-01","1982-12-31","TEST-SCLOSED"])
 f.api.invalidateActorSource();const data=await (await f.readLicences()).json()
 assert.equal(data.references.defaultSeasonId,"S26");assert.equal(data.references.seasons.length,3)
 assert.deepEqual(data.references.seasons.map((s:{id:string})=>s.id),["S27","S26","SOLD"])
 f.state.books.REFS.STATUTS_SAISON=[["id_statut_saison","nom_statut","statut"]];f.api.invalidateActorSource()
 const empty=await (await f.readLicences()).json();assert.ok(empty.references.issues.some((s:string)=>s.includes("STATUTS_SAISON")))
 assert.equal(empty.references.seasons.some((s:{issuable:boolean})=>s.issuable),false)
 f.state.failRead="REFS";f.api.invalidateActorSource();assert.equal((await f.readLicences()).status,503)
})

test("season change after a warm read is checked fresh before mutation without overwriting historical IDs", async () => {
 const f=await licencesFixture();await f.seedAthlete();await f.readLicences()
 f.state.books.REFS.SAISON[1][4]="TEST-SCLOSED"
 const before=f.state.writes.length
 assert.equal((await f.writeLicence(f.athleteInput)).status,422)
 assert.equal(f.state.writes.length,before)
 const fresh=await (await f.readLicences("athletes","?fresh=1")).json()
 assert.equal(fresh.references.seasons.find((s:{id:string})=>s.id==="S26").state,"CLOTUREE")
 assert.equal(f.state.books.REFS.SAISON[1][0],"S26")
})

test("season deletion never renames historical foreign keys or hides the licence", async () => {
 const f=await licencesFixture();await f.seedAthlete();await f.writeLicence(f.athleteInput)
 f.state.books.REFS.SAISON.splice(1,1);f.api.invalidateActorSource()
 const data=await (await f.readLicences()).json()
 assert.equal(data.rows.length,1);assert.equal(data.rows[0].seasonId,"S26");assert.equal(data.rows[0].season,"S26")
 assert.equal(data.rows[0].effective,"SAISON_INVALIDE");assert.ok(data.rows[0].anomaly)
 assert.equal(data.rows[0].values.id_saison,"S26")
})
test("licences: fresh guards before sources, no rights fallback, malformed category", async () => {
 const f = await licencesFixture(); f.state.loggedIn = false
 assert.equal((await f.readLicences()).status, 401); assert.equal((await f.writeLicence(f.athleteInput)).status, 401)
 f.state.loggedIn = true; f.state.canRead = false; f.state.canWrite = false
 assert.equal((await f.readLicences()).status, 403); assert.equal((await f.writeLicence(f.athleteInput)).status, 403)
 assert.equal(f.state.reads.length, 0); assert.equal(f.state.writes.length, 0)
 f.state.failSecurity = true; assert.equal((await f.readLicences()).status, 503)
})
test("athlete licence: create, mapped joins, immutable identity, version conflict and unknown columns", async () => {
 const f = await licencesFixture(); await f.seedAthlete()
 const response = await f.writeLicence(f.athleteInput); assert.equal(response.status, 201, JSON.stringify(await response.clone().json()))
 const record = (await response.json()).confirmed[0]; assert.equal(record.id_licence, "FECOT-LIC-2026-000001")
 const data = await (await f.readLicences()).json(); assert.equal(data.rows[0].club, "Club Test Alpha"); assert.equal(data.rows[0].ligueId, "01"); assert.equal(data.rows[0].actorName, "Synthetic actor")
 assert.ok(!JSON.stringify(data).includes("numero_passeport"))
 assert.equal((await f.writeLicence(f.athleteInput)).status, 409)
 const table = f.state.books.LIC.ATHLETE_LICENCES; table[1][table[0].length - 1] = "Preserved"
 f.api.invalidateActorSource(); const current = (await (await f.readLicences()).json()).rows[0]
 const update = await f.writeLicence({ ...current.values, numero_licence: "N-NEW", version: current.version }, "athletes", "PUT", `?id=${current.id}`)
 assert.equal(update.status, 200); assert.equal(table[1][table[0].length - 1], "Preserved")
 assert.equal((await f.writeLicence({ ...current.values, version: current.version }, "athletes", "PUT", `?id=${current.id}`)).status, 409)
 const fresh = (await (await f.readLicences()).json()).rows[0]
 assert.equal((await f.writeLicence({ ...fresh.values, id_saison: "S27", version: fresh.version }, "athletes", "PUT", `?id=${fresh.id}`)).status, 422)
})
test("athlete: date, season, affiliation owner, club and empty reference validation", async () => {
 const f = await licencesFixture(); await f.seedAthlete()
 for (const change of [{ date_delivrance: "30022026" }, { id_saison: "UNKNOWN" }, { id_statut_licence: "STL001" }, { id_affiliation_athlete: "UNKNOWN" }, { id_athlete: "OTHER" }, { id_licence: "HACK" }]) assert.equal((await f.writeLicence({ ...f.athleteInput, ...change })).status, 422)
 f.state.books.REFS.STATUT_LICENCE = [["id_statut_licence", "nom_statut_licence"]]; f.api.invalidateActorSource()
 const data = await (await f.readLicences()).json(); assert.deepEqual(data.rows, []); assert.ok(data.references.issues.length)
 assert.equal((await f.writeLicence(f.athleteInput)).status, 422)
 f.state.failRead = "LIC"; f.api.invalidateActorSource(); assert.equal((await f.readLicences()).status, 503)
})
test("referee exemption, actor period overlap, type identity and effective states", async () => {
 const f = await licencesFixture(); await f.write("arbitres")
 const response = await f.writeLicence(f.actorInput, "acteurs"); assert.equal(response.status, 201, JSON.stringify(await response.clone().json()))
 assert.equal((await f.writeLicence(f.actorInput, "acteurs")).status, 409)
 assert.equal((await f.writeLicence({ ...f.actorInput, id_affiliation_acteur: "AFA-000001" }, "acteurs")).status, 422)
 assert.equal((await f.writeLicence({ ...f.actorInput, id_type_acteur: "TEST-COA" }, "acteurs")).status, 422)
 const data = await (await f.readLicences("acteurs")).json(); assert.equal(data.rows[0].target, "Non applicable")
 assert.equal(effectiveStatus("ACTIVE", "2026-01-01", "2026-12-31", "2026-06-01"), "VALIDE")
 assert.equal(effectiveStatus("ACTIVE", "2027-01-01", "2027-12-31", "2026-06-01"), "A_VENIR")
 assert.equal(effectiveStatus("ACTIVE", "2025-01-01", "2025-12-31", "2026-06-01"), "EXPIREE")
 assert.equal(effectiveStatus("ACTIVE", "", "2026-12-31", "2026-06-01"), "DATES_INVALIDES")
})
test("actor affiliations must be current at validity start and refer to the same actor", async () => {
 const f = await licencesFixture(); await f.write("coachs"); await f.write("coachs", { ...f.input, nom_complet: "Other coach" })
 const aff = (await (await f.writeAffiliation(f.affiliationInput, "coachs", "COA-0001")).json()).affiliation
 const input = { ...f.actorInput, id_type_acteur: "TEST-COA", id_acteur: "COA-0001", id_affiliation_acteur: aff.id }
 assert.equal((await f.writeLicence({ ...input, id_affiliation_acteur: "" }, "acteurs")).status, 422)
 assert.equal((await f.writeLicence({ ...input, id_acteur: "COA-0002" }, "acteurs")).status, 422)
 assert.equal((await f.writeLicence({ ...input, date_debut_validite: "2025-01-01", date_delivrance: "2025-01-01" }, "acteurs")).status, 422)
 assert.equal((await f.writeLicence(input, "acteurs")).status, 201)
})
test("actor status transitions use FECOT labels, retain IDs and reject stale versions", async () => {
 const f = await licencesFixture(); await f.write("arbitres"); await f.writeLicence(f.actorInput, "acteurs")
 let row = (await (await f.readLicences("acteurs")).json()).rows[0]
 const suspend = await f.writeLicence({ id: row.id, version: row.version, action: "suspend" }, "acteurs", "PATCH"); assert.equal(suspend.status, 200)
 assert.equal((await suspend.json()).confirmed[0].id_statut_licence, "TEST-LSUS")
 assert.equal((await f.writeLicence({ id: row.id, version: row.version, action: "reactivate" }, "acteurs", "PATCH")).status, 409)
 row = (await (await f.readLicences("acteurs")).json()).rows[0]
 assert.equal((await f.writeLicence({ id: row.id, version: row.version, action: "reactivate" }, "acteurs", "PATCH")).status, 200)
})
test("renew club stages all commands before one append and preserves previous numbers", async () => {
 const f = await licencesFixture(); await f.seedAthlete(); await f.writeLicence(f.athleteInput)
 const input = { id_club: "C001", id_saison: "S27", id_affiliations_athletes: ["AFA-000001"], date_delivrance: "01012027", id_statut_licence: "TEST-LACT", observations: "" }
 const before = f.state.writes.length
 assert.equal((await f.writeLicence({ ...input, id_affiliations_athletes: ["AFA-000001", "UNKNOWN"] }, "athletes", "POST", "?mode=club")).status, 422)
 assert.equal(f.state.writes.length, before)
 const response = await f.writeLicence(input, "athletes", "POST", "?mode=club"); assert.equal(response.status, 201)
 assert.equal(f.state.writes.length, before + 1); assert.equal((await response.json()).confirmed[0].numero_licence, "N-001")
 assert.equal((await f.writeLicence(input, "athletes", "POST", "?mode=club")).status, 409)
})
test("history resolves the recorded club, scopes actor/type and filters before response", async () => {
 const f = await licencesFixture(); await f.seedAthlete(); await f.writeLicence(f.athleteInput)
 const oldAff = (await (await f.readAffiliations()).json()).affiliations[0]
 await f.writeAffiliation({ ...oldAff.values, date_fin: "2026-12-31", id_statut_affiliation: "TEST-END", version: oldAff.version }, "athletes", "ATH00001", oldAff.id)
 await f.writeAffiliation({ ...f.affiliationInput, id_club: "C002", date_debut: "2027-01-01" })
 await f.write("athletes", { ...f.input, nom_complet: "Other athlete" })
 const history = await (await f.readLicences("athletes", "?kind=athletes&actorId=ATH00001")).json()
 assert.equal(history.rows.length, 1); assert.equal(history.rows[0].club, "Club Test Alpha"); assert.equal(history.references, undefined)
 assert.deepEqual((await (await f.readLicences("athletes", "?kind=athletes&actorId=ATH00002")).json()).rows, [])
 assert.equal((await f.readLicences("athletes", "?kind=coachs&actorId=COA-0001")).status, 422)
 assert.equal((await f.readLicences("athletes", "?kind=athletes&actorId=UNKNOWN")).status, 404)
})
test("local concurrent duplicate creation has one writer and confirmations fail closed", async () => {
 const f = await licencesFixture(); await f.seedAthlete()
 assert.deepEqual((await Promise.all([f.writeLicence(f.athleteInput), f.writeLicence(f.athleteInput)])).map(r => r.status), [201, 409])
 f.state.failConfirm = true; f.state.wrote = false
 const response = await f.writeLicence({ ...f.athleteInput, id_saison: "S27", date_delivrance: "2027-01-01" })
 assert.equal(response.status, 503); assert.equal((await response.json()).error.uncertain, true)
})
test("technical IDs preserve historical rows, zeros and series exhaustion", () => {
 assert.equal(nextLicenceId("athletes", "2026", [{ id_licence: "LEGACY-UUID" }, { id_licence: "FECOT-LIC-2026-000009" }]), "FECOT-LIC-2026-000010")
 assert.throws(() => nextLicenceId("athletes", "2026", [{ id_licence: "FECOT-LIC-2026-999999" }]))
})
test("licence pages batch cold reads, reuse warm data and never reuse old rights", async () => {
 const f = await licencesFixture(); await f.seedAthlete(); f.api.invalidateActorSource(); f.state.reads.splice(0)
 const first = await f.readLicences(); assert.equal(first.status, 200); assert.equal(f.state.reads.length, 5)
 const data = await first.json(); assert.equal(data.references.clubs[0].ligueId, "01")
 await f.readLicences(); assert.equal(f.state.reads.length, 5)
 f.state.canRead = false; assert.equal((await f.readLicences()).status, 403); assert.equal(f.state.reads.length, 5)
})
test("referee history reads no affiliation or territory and uses only the requested profile", async () => {
 const f = await licencesFixture(); await f.write("arbitres"); await f.writeLicence(f.actorInput, "acteurs"); f.api.invalidateActorSource(); f.state.reads.splice(0); f.state.failRead = "STRUCTURE"
 const response = await f.readLicences("acteurs", "?kind=arbitres&actorId=ARB0001"); assert.equal(response.status, 200)
 assert.equal(f.state.reads.length, 3); assert.ok(f.state.reads.every(r => !r.startsWith("AFF:") && !r.startsWith("STRUCTURE:")))
 assert.equal((await response.json()).rows[0].actorName, "Synthetic actor")
})
test("reordered licence columns are mapped by headers and broken dates cannot be rewritten by transition", async () => {
 const f = await licencesFixture(); await f.write("arbitres")
 const headers = f.state.books.LIC.ACTEURS_LICENCES[0]; [headers[0], headers[1]] = [headers[1], headers[0]]
 assert.equal((await f.writeLicence(f.actorInput, "acteurs")).status, 201)
 const rows = (await (await f.readLicences("acteurs")).json()).rows; assert.equal(rows[0].number, "ARB-N-001")
 f.state.books.LIC.ACTEURS_LICENCES[1][headers.indexOf("date_delivrance")] = "invalid"
 f.api.invalidateActorSource(); const row = (await (await f.readLicences("acteurs")).json()).rows[0]
 const before = f.state.writes.length
 assert.equal((await f.writeLicence({ id: row.id, version: row.version, action: "cancel" }, "acteurs", "PATCH")).status, 422)
 assert.equal(f.state.writes.length, before)
})
test("a licence prevents retargeting its affiliation and a broken legacy owner never joins another person's club", async () => {
 const f = await licencesFixture(); await f.seedAthlete(); await f.writeLicence(f.athleteInput)
 const aff = (await (await f.readAffiliations()).json()).affiliations[0]
 assert.equal((await f.writeAffiliation({ ...aff.values, id_club: "C002", version: aff.version }, "athletes", "ATH00001", aff.id)).status, 409)
 await f.write("athletes", { ...f.input, nom_complet: "Other synthetic athlete" })
 const table = f.state.books.LIC.ATHLETE_LICENCES, headers = table[0]
 table.push(headers.map(key => key === "id_licence" ? "LEGACY-BROKEN" : key === "id_athlete" ? "ATH00002" : f.athleteInput[key as keyof typeof f.athleteInput] || ""))
 f.api.invalidateActorSource(); const row = (await (await f.readLicences()).json()).rows.find((r: { id: string }) => r.id === "LEGACY-BROKEN")
 assert.equal(row.club, ""); assert.ok(row.anomaly); assert.equal(row.target, "AFA-000001")
})
test("licence creation and affiliation retargeting share the local write queue", async () => {
 const f = await licencesFixture(); await f.seedAthlete()
 const aff = (await (await f.readAffiliations()).json()).affiliations[0]
 const [licence, retarget] = await Promise.all([f.writeLicence(f.athleteInput), f.writeAffiliation({ ...aff.values, id_club: "C002", version: aff.version }, "athletes", "ATH00001", aff.id)])
 assert.equal(licence.status, 201); assert.equal(retarget.status, 409)
 assert.equal((await (await f.readLicences()).json()).rows[0].club, "Club Test Alpha")
})
test("missing licence configuration identifies the variable without exposing a value or reading Google", async () => {
 const f = await licencesFixture(); Reflect.deleteProperty(f.state.env, "FECOT_LICENCES_SPREADSHEET_ID")
 const response = await f.readLicences(); assert.equal(response.status, 503)
 const error = (await response.json()).error; assert.equal(error.code, "CONFIG"); assert.ok(error.message.includes("FECOT_LICENCES_SPREADSHEET_ID")); assert.equal(f.state.reads.length, 0)
})
