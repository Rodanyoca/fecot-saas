import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {actorsFixture} from "./actors-fixture.ts"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {actorKinds} from "../lib/actors/model.ts"
test("actors: 401/403/security failure precede reads, references, writes and Drive",async()=>{
 const f=await actorsFixture();f.state.loggedIn=false;assert.equal((await f.read()).status,401);assert.equal((await f.write()).status,401)
 f.state.loggedIn=true;f.state.canRead=false;f.state.canWrite=false;assert.equal((await f.read()).status,403);assert.equal((await f.write()).status,403)
 assert.equal((await f.api.actorMediaGet("athletes","x","passport")).status,403)
 assert.equal(f.state.reads.length,0);assert.equal(f.state.writes.length,0);assert.equal(f.state.driveReads.length,0)
 f.state.failSecurity=true;assert.equal((await f.read()).status,503)
})
test("six kinds: create, scoped list/detail, partial edit, projection, immutable ID and confirmation",async()=>{
 const f=await actorsFixture()
 for(const kind of actorKinds){
  const created=await f.write(kind,{...f.input,numero_passeport:"000123"});assert.equal(created.status,201)
  const actor=(await created.json()).actor;assert.equal(actor.id,({athletes:"ATH00001",coachs:"COA-0001",arbitres:"ARB0001",officiels:"OFF0001",medecins:"MED0001","autres-acteurs":"AUT0001"})[kind])
  const list=await f.read(kind);assert.equal(list.headers.get("cache-control"),"private, no-store")
  const listData=await list.json(),rows=listData.actors;assert.equal(rows.length,1);assert.equal(rows[0].values.numero_passeport,undefined)
  assert.equal(listData.editorData.kind,kind)
  assert(listData.editorData.fields.some((field:{key:string})=>field.key==="nom_complet"))
  assert.deepEqual(listData.editorData.references.SEXES.map((option:{id:string})=>option.id),["FECOT-SEX-001","FECOT-SEX-002"])
  const detail=await f.read(kind,actor.id);assert.equal((await detail.json()).actor.values.numero_passeport,"000123")
  assert.equal((await f.write(kind,{telephone:"0001"},actor.id)).status,200)
  assert.equal((await f.write(kind,{id:"evil"},actor.id)).status,422)
  assert.equal((await f.read(kind,"missing")).status,404)
 }
 assert.equal(f.state.driveReads.length,0)
})
test("concurrent list requests share raw reads; writes invalidate old reads and duplicate IDs are rejected",async()=>{
 const f=await actorsFixture();await Promise.all([f.read(),f.read(),f.read()]);assert.equal(f.state.reads.length,2)
 const body={...f.input,id_national:"0001"};const result=await Promise.all([f.write("athletes",body),f.write("athletes",body)])
 assert.deepEqual(result.map(r=>r.status),[201,422]);assert.equal(f.state.writes.length,1)
 assert.equal((await (await f.read()).json()).actors.length,1)
})
test("source/confirmation failures never report a false empty/success; no automatic retry",async()=>{
 const f=await actorsFixture();f.state.failRead="ACTORS";assert.equal((await f.read()).status,503)
 f.state.failRead="";f.state.failConfirm=true;const response=await f.write();assert.equal(response.status,503)
 assert.equal((await response.json()).error.uncertain,true);assert.equal(f.state.writes.length,1)
})
test("reordered actor headers keep the real primary key; duplicate names are legitimate",async()=>{
 const f=await actorsFixture(),table=f.state.books.ACTORS.ATHLETES
 ;[table[0][0],table[0][1]]=[table[0][1],table[0][0]]
 assert.equal((await f.write()).status,201)
 assert.equal((await f.write()).status,201)
 const response=await f.read();assert.equal(response.status,200)
 assert.equal((await response.json()).actors.length,2)
})

test("an in-flight read before a write cannot repopulate the invalidated cache",async()=>{
 const f=await actorsFixture();let release!:()=>void
 f.state.gate=new Promise<void>(resolve=>{release=resolve})
 const old=f.read()
 while(f.state.reads.length<2)await new Promise(resolve=>setTimeout(resolve,1))
 f.state.gate=null
 assert.equal((await f.write()).status,201)
 release();await old
 const current=await f.read();assert.equal((await current.json()).actors.length,1)
})

test("affiliations/licences load only on request, filter actor/type and isolate failures",async()=>{
 const f=await actorsFixture(),actor=(await (await f.write()).json()).actor
 await f.read("athletes",actor.id);assert(!f.state.reads.some(c=>c.startsWith("AFF:")||c.startsWith("LIC:")))
 f.state.books.AFF.ATHLETE_AFFILIATIONS.push(["REL1",actor.id,"CLUB1"],["REL2","OTHER","CLUB2"])
 const response=await f.read("athletes",actor.id,"?section=affiliations");assert.equal(response.status,200);assert.equal((await response.json()).sections[0].rows.length,1)
 f.state.failRead="LIC";assert.equal((await f.read("athletes",actor.id,"?section=licences")).status,503)
 assert.equal((await f.read("athletes",actor.id)).status,200)
})
test("media binary only on consultation; private content, validation, upload confirmation and public folder refusal",async()=>{
 const f=await actorsFixture(),actor=(await (await f.write()).json()).actor
 const upload=()=>{const form=new FormData();form.set("file",new File([Buffer.from('%PDF-1.4\nfixture')],"passport.pdf",{type:"application/pdf"}));return f.api.actorMediaPut("athletes",actor.id,"passport",new Request("http://offline.invalid/media",{method:"PUT",body:form}))}
 assert.equal((await upload()).status,200);assert.equal(f.state.driveWrites.length,1)
 const response=await f.api.actorMediaGet("athletes",actor.id,"passport");assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"private, no-store");assert.match(response.headers.get("content-disposition")||"",/^attachment/)
 f.state.publicFolder=true;assert.equal((await upload()).status,503);assert.equal(f.state.driveWrites.length,1)
 const form=new FormData();form.set("file",new File(["invalid"],"fake.pdf",{type:"application/pdf"}));assert.equal((await f.api.actorMediaPut("athletes",actor.id,"passport",new Request("http://offline.invalid/media",{method:"PUT",body:form}))).status,422)
})
