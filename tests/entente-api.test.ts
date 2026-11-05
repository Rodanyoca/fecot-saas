import { test } from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { runInNewContext } from "node:vm"
import { createRequire } from "node:module"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { mapTable, schema } from "../lib/territorial-schema.ts"
import type { Row } from "../lib/territorial-schema.ts"

const table = (headers: readonly string[], rows: Row[] = []) => mapTable([[...headers], ...rows.map(r => headers.map(h => r[h] ?? ""))], headers)
async function fixture() {
  const state = {
    loggedIn: true, canWrite: true, writes: 0, reads: 0, checks: 0, invalidations: 0, actorTerritoryInvalidations: 0, failWrite: false,
    tables: {LIGUES:table(schema.LIGUES,[{id_ligue:"01",id_province:"P"},{id_ligue:"02",id_province:"P"}]),ENTENTES:table(schema.ENTENTES),CLUBS:table(schema.CLUBS)},
    refs:{PROVINCES:table(["id_province"],[{id_province:"P"}]),VILLES:table(["id_ville"]),CATEGORIES_CLUB:table(["id_categorie_club"]),SEXES:table(["id_sexe"])},
  }
  const mocks:Record<string,string> = {
    "server-only":"",
    "./actors/service":"export const invalidateActorTerritorySource=()=>{state.actorTerritoryInvalidations++}",
    "next/server":"export const NextResponse={json:(body,options)=>Response.json(body,options)}",
    "next/cache":"export const revalidateTag=()=>{globalThis.state.invalidations++};export const revalidatePath=()=>{}",
    "./auth":"export const getSession=async()=>{globalThis.state.checks++;return globalThis.state.loggedIn?{doitChangerMotDePasse:false}:null};export const getNavigationAccess=async()=>({'AUT-SPT:WRITE':globalThis.state.canWrite})",
    "./territorial-store":`export const readTables=async()=>{state.reads++;return {tables:state.tables,refs:state.refs}};export const writeRecord=async(sheet,table,id,record,editing)=>{if(state.failWrite)throw Error('Synthetic Google failure');state.writes++;if(editing)Object.assign(table.rows.find(row=>row.id_entente===id),record);else table.rows.push(record)}`,
    "./territorial-data":"export const TERRITORIAL_CACHE_TAG='test';export const getTerritorialData=async()=>({ententes:state.tables.ENTENTES.rows.map(row=>({idEntente:row.id_entente,codeEntente:row.code_entente,idLigue:row.id_ligue}))})",
  }
  const result=await build({entryPoints:["lib/territorial-api.ts"],bundle:true,write:false,platform:"node",format:"cjs",plugins:[{name:"offline-boundaries",setup(b){
    b.onResolve({filter:/.*/},args=>Object.hasOwn(mocks,args.path)?{path:args.path,namespace:"offline"}:undefined)
    b.onLoad({filter:/.*/,namespace:"offline"},args=>({contents:mocks[args.path],loader:"js"}))
  }}]})
  const module={exports:{} as {mutateTerritory:(sheet:string,request:Request,id?:string)=>Promise<Response>}}
  runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url),state,Response,console:{error:()=>{}}})
  const call=(extra:Record<string,unknown>={},id?:string)=>module.exports.mutateTerritory("ENTENTES",new Request("http://offline.invalid/api/ententes",{method:id?"PATCH":"POST",body:JSON.stringify({idLigue:"01",codeEntente:"0102",nomEntente:"Synthetic",statut:"ACTIF",...extra})}),id)
  return {state,call}
}

test("entente API: fresh rights before reads; computed ID, confirmation, duplicate and key-change refusal",async()=>{
  const {state,call}=await fixture()
  state.loggedIn=false;assert.equal((await call()).status,401)
  state.loggedIn=true;state.canWrite=false;assert.equal((await call()).status,403)
  assert.equal(state.reads,0);assert.equal(state.writes,0)
  state.canWrite=true
  const response=await call();assert.equal(response.status,201)
  assert.equal((await response.json()).entente.idEntente,"0102")
  assert.equal(state.tables.ENTENTES.rows[0].code_entente,"02")
  assert.equal((await call()).status,422);assert.equal(state.writes,1)
  assert.equal((await call({id_entente:"HACK"})).status,422)
  assert.equal((await call({codeEntente:"03"},"0102")).status,409)
  assert.equal((await call({idLigue:"02",codeEntente:"02"},"0102")).status,409)
  assert.equal(state.writes,1);assert.equal(state.invalidations,1)
  assert.equal(state.actorTerritoryInvalidations,1)
  assert.equal((await call({nomEntente:"New name"},"0102")).status,200)
  assert.equal(state.writes,2)
})

test("entente API: concurrent duplicate creation has one writer, outage does not poison queue",async()=>{
  const {state,call}=await fixture()
  assert.deepEqual((await Promise.all([call(),call()])).map(r=>r.status),[201,422])
  assert.equal(state.writes,1)
  state.failWrite=true;assert.equal((await call({codeEntente:"03",nomEntente:"Another"})).status,503)
  state.failWrite=false;assert.equal((await call({codeEntente:"03",nomEntente:"Another"})).status,201)
  state.canWrite=false;assert.equal((await call({codeEntente:"04"})).status,403)
  assert.equal(state.writes,2)
})
