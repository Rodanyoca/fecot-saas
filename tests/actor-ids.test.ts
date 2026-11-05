import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {actorKinds,nextActorId,type ActorKind,actorConfig} from "../lib/actors/model.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {actorsFixture} from "./actors-fixture.ts"

const expected:Record<ActorKind,[string,string]>={athletes:["ATH00001","ATH00002"],coachs:["COA-0001","COA-0002"],arbitres:["ARB0001","ARB0002"],officiels:["OFF0001","OFF0002"],medecins:["MED0001","MED0002"],"autres-acteurs":["AUT0001","AUT0002"]}
test("all actor categories use their requested prefix, separator and padded sequence",()=>{
 for(const kind of actorKinds){const [first,second]=expected[kind];assert.equal(nextActorId(kind,[]),first);assert.equal(nextActorId(kind,[first]),second);assert.equal(nextActorId(kind,[`FECOT-${actorConfig[kind].prefix}-synthetic-legacy`,first]),second)}
 assert.equal(nextActorId("coachs",["COA0009","COA-0002"]),"COA-0010")
 assert.equal(nextActorId("officiels",["OFF-0009"]),"OFF0010")
 assert.equal(nextActorId("arbitres",["ARB0008","ARB0002"]),"ARB0009")
 for(const kind of actorKinds.filter(kind=>kind!=="athletes"))assert.throws(()=>nextActorId(kind,[`${actorConfig[kind].prefix}9999`]))
})

test("all categories allocate serially on the server and preserve legacy keys on edit",async()=>{
 const f=await actorsFixture()
 for(const kind of actorKinds){
  const created=await Promise.all([f.write(kind),f.write(kind)]);assert.deepEqual(created.map(response=>response.status),[201,201])
  const data=await Promise.all(created.map(response=>response.json()));assert.deepEqual(data.map(body=>body.actor.id),expected[kind])
  const c=actorConfig[kind],legacy=`FECOT-${c.prefix}-synthetic-legacy`,table=f.state.books.ACTORS[c.sheet]
  table.push(table[0].map(key=>key===c.id?legacy:key==="nom_complet"?"Synthetic legacy":key==="id_sexe"?"FECOT-SEX-001":key==="statut"?"ACTIF":""))
  const response=await f.write(kind,{telephone:"0001"},legacy);assert.equal(response.status,200);assert.equal((await response.json()).actor.id,legacy)
  assert.equal((await f.write(kind,{...f.input,[c.id]:"OVERRIDE"})).status,422)
 }
})
