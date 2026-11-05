import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {nextAthleteId,ActorError} from "../lib/actors/model.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {actorsFixture} from "./actors-fixture.ts"

test("ATH IDs are five digit strings, increment the maximum and accept existing legacy IDs",()=>{
 assert.equal(nextAthleteId([]),"ATH00001")
 assert.equal(nextAthleteId(["ATH00001"]),"ATH00002")
 assert.equal(nextAthleteId(["ATH00003","ATH00001"]),"ATH00004")
 assert.equal(nextAthleteId(["FECOT-ATH-legacy-uuid","OTHER00050"]),"ATH00001")
 assert.equal(nextAthleteId(["FECOT-ATH-legacy-uuid","ATH00009"]),"ATH00010")
 assert.equal(nextAthleteId(["ATH99998"]),"ATH99999")
 assert.throws(()=>nextAthleteId(["ATH99999"]),(error:unknown)=>error instanceof ActorError&&error.code==="ID_EXHAUSTED")
 assert.throws(()=>nextAthleteId(["ATH100000"]),ActorError)
})

test("concurrent athlete creations get successive IDs; editing preserves IDs and cannot choose one",async()=>{
 const f=await actorsFixture()
 const responses=await Promise.all([f.write(),f.write()])
 assert.deepEqual(responses.map(r=>r.status),[201,201])
 const created=await Promise.all(responses.map(r=>r.json()))
 assert.deepEqual(created.map(data=>data.actor.id),["ATH00001","ATH00002"])
 const update=await f.write("athletes",{telephone:"0000001"},"ATH00001")
 assert.equal(update.status,200);assert.equal((await update.json()).actor.id,"ATH00001")
 assert.equal((await f.write("athletes",{...f.input,id_athlete:"ATH00099"})).status,422)
})

test("legacy athlete reads and updates remain compatible without automatic renaming",async()=>{
 const f=await actorsFixture(),table=f.state.books.ACTORS.ATHLETES,oldId="FECOT-ATH-synthetic-legacy"
 table.push(table[0].map(key=>key==="id_athlete"?oldId:key==="nom_complet"?"Synthetic legacy":key==="id_sexe"?"FECOT-SEX-001":key==="statut"?"ACTIF":""))
 assert.equal((await f.read("athletes",oldId)).status,200)
 const updated=await f.write("athletes",{nom_complet:"Synthetic updated"},oldId)
 assert.equal(updated.status,200);assert.equal((await updated.json()).actor.id,oldId)
 const created=await f.write();assert.equal((await created.json()).actor.id,"ATH00001")
})
