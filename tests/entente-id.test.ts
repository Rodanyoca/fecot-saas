import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { ententeIdentity, EntenteKeyMigrationRequired } from "../lib/entente-id.ts"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { prepareRecord } from "../lib/territorial-domain.ts"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { mapTable, schema } from "../lib/territorial-schema.ts"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { planEntenteIds } from "../lib/entente-id-migration.ts"
import type { Row } from "../lib/territorial-schema.ts"
// @ts-expect-error Node requires explicit TypeScript extensions.
import { mapEntenteRow } from "../lib/mappers/ententes.ts"

const table = (headers: readonly string[], rows: Row[] = []) => mapTable([[...headers], ...rows.map(r => headers.map(h => r[h] ?? ""))], headers)
const fixture = (rows: Row[] = []) => ({
  tables: { LIGUES: table(schema.LIGUES, [{id_ligue:"01", id_province:"P1"},{id_ligue:"02", id_province:"P1"}]), ENTENTES: table(schema.ENTENTES, rows), CLUBS: table(schema.CLUBS, [{id_club:"C1", id_entente:"legacy", nom_club:"Child"}]) },
  refs: {PROVINCES: table(["id_province"],[{id_province:"P1"}]), VILLES: table(["id_ville"]), CATEGORIES_CLUB: table(["id_categorie_club"]), SEXES: table(["id_sexe"])},
})
const payload = {idLigue:"01", codeEntente:"02", nomEntente:"Synthetic", statut:"ACTIF"}

test("identity is text, preserves zeros, accepts exactly one matching full prefix", () => {
  assert.deepEqual(ententeIdentity("01","02"), {idLigue:"01", codeEntente:"02", idEntente:"0102"})
  assert.equal(ententeIdentity("01","0102").idEntente,"0102")
  assert.equal(ententeIdentity("01","01").idEntente,"0101")
  assert.equal(ententeIdentity("02","02").idEntente,"0202")
  assert.equal(ententeIdentity("FECOT-LIG-test","02").idEntente,"FECOT-LIG-test02")
  for (const code of [2, null, "", "2", "002", "0202", "010102", "AA", "-2", "0 2", "0\n2", "=02"]) assert.throws(()=>ententeIdentity("01",code))
  for (const ligue of [1, null, "", "../01"]) assert.throws(()=>ententeIdentity(ligue,"02"))
})

test("server derives creation ID, normalizes code and rejects spoofed/unknown parent and collisions", () => {
  const {tables,refs}=fixture()
  const result=prepareRecord("ENTENTES",{...payload,codeEntente:"0102"},tables,refs,undefined,"UNTRUSTED-RANDOM")
  assert.equal(result.id,"0102");assert.equal(result.record.id_entente,"0102");assert.equal(result.record.code_entente,"02")
  for(const extra of [{id_entente:"HACK"},{id:"HACK"},{idLigue:""},{idLigue:"99"}]) assert.throws(()=>prepareRecord("ENTENTES",{...payload,...extra},tables,refs,undefined,"unused"))
  tables.ENTENTES=table(schema.ENTENTES,[{id_entente:"legacy",id_ligue:"01",code_entente:"0102",nom_entente:"Other"}])
  assert.throws(()=>prepareRecord("ENTENTES",payload,tables,refs,undefined,"unused"),/existe déjà/)
  assert.equal(prepareRecord("ENTENTES",{...payload,idLigue:"02"},tables,refs,undefined,"unused").id,"0202")
  tables.ENTENTES=table(schema.ENTENTES,[{id_entente:"0102",id_ligue:"02",code_entente:"03",nom_entente:"Other"}])
  assert.throws(()=>prepareRecord("ENTENTES",payload,tables,refs,undefined,"unused"),/Identifiant déjà/)
})

test("legacy and canonical edits preserve keys and children; reparent/code changes require migration", () => {
  for(const id of ["legacy","0102"]) {
    const {tables,refs}=fixture([{id_entente:id,id_ligue:"01",code_entente:"02",nom_entente:"Synthetic"}])
    const before=JSON.stringify(tables)
    const saved=prepareRecord("ENTENTES",{...payload,nomEntente:"Renamed"},tables,refs,id,"unused")
    assert.equal(saved.id,id);assert.equal(saved.record.id_entente,undefined)
    assert.throws(()=>prepareRecord("ENTENTES",{...payload,idLigue:"02"},tables,refs,id,"unused"),EntenteKeyMigrationRequired)
    assert.throws(()=>prepareRecord("ENTENTES",{...payload,codeEntente:"03"},tables,refs,id,"unused"),EntenteKeyMigrationRequired)
    assert.equal(JSON.stringify(tables),before)
  }
})

test("mapper preserves stored legacy and canonical IDs and normalizes only unambiguous local codes", () => {
  for(const id of ["legacy","0102"]) {
    const result=mapEntenteRow({id_entente:id,id_ligue:"01",code_entente:"0102"})
    assert.equal(result.idEntente,id);assert.equal(result.id,id)
    assert.equal(result.codeEntente,"02");assert.equal(result.numeroOrdre,"02")
  }
  assert.equal(mapEntenteRow({id_entente:"legacy",id_ligue:"01",code_entente:"ambiguous"}).codeEntente,"ambiguous")
})

const snapshot = () => ({tables:{LIGUES:[["id_ligue"],["01"],["02"]], ENTENTES:[["id_entente","id_ligue","code_entente"],["legacy","01","0102"]], CLUBS:[["id_club","id_entente"],["C","legacy"]]}, inventoryComplete:true})
test("offline plan inventories legacy IDs and all declared dependent workbooks without mutating input", () => {
  const input={...snapshot(),dependencies:[{workbook:"users",sheet:"SCOPES",values:[["id_user","id_entente"],["U","legacy"]]}]}
  const before=JSON.stringify(input),plan=planEntenteIds(input)
  assert.equal(plan.reviewable,true);assert.equal(plan.executable,false)
  assert.deepEqual(plan.mapping.map(m=>[m.oldId,m.newId]),[["legacy","0102"]])
  assert.deepEqual(plan.cells.map(c=>[c.sheet,c.column,c.after]),[["ENTENTES","id_entente","0102"],["ENTENTES","code_entente","02"],["CLUBS","id_entente","0102"],["SCOPES","id_entente","0102"]])
  assert.equal(JSON.stringify(input),before)
})

test("offline plan blocks collisions, ambiguous codes, numeric values, orphans and incomplete inventories", () => {
  const check=(input:ReturnType<typeof snapshot>,kind:string)=>assert(planEntenteIds(input).issues.some(i=>i.kind===kind),kind)
  const a=snapshot();a.tables.ENTENTES.push(["other","01","02"]);check(a,"TARGET_COLLISION")
  const b=snapshot();b.tables.ENTENTES.push(["0102","02","03"]);check(b,"TARGET_ALREADY_OCCUPIED")
  const c=snapshot();c.tables.ENTENTES.push(["legacy","02","03"]);check(c,"DUPLICATE_OLD_ID")
  const d=snapshot();d.tables.ENTENTES[1][2]="002";check(d,"INVALID_ID_OR_LOCAL_CODE")
  const e=snapshot();e.tables.CLUBS.push(["orphan","missing"]);check(e,"DANGLING_REFERENCE")
  check({...snapshot(),inventoryComplete:false},"INVENTORY_NOT_CONFIRMED")
  const f=snapshot();const numeric={...f,tables:{...f.tables,ENTENTES:[["id_entente","id_ligue","code_entente"],["legacy","01",2]]}}
  assert(planEntenteIds(numeric).issues.some(i=>i.kind==="INVALID_ID_OR_LOCAL_CODE"))
  const g={...snapshot(),dependencies:[{workbook:"users",sheet:"JOURNAL",values:[["type_objet","id_objet"],["ENTENTE","legacy"]]}]}
  assert(planEntenteIds(g).issues.some(i=>i.kind==="UNCLASSIFIED_REFERENCE_REQUIRES_REVIEW"))
})

test("reparent plan changes the key and references together, pending geography and scope review", () => {
  const input={...snapshot(),changes:[{oldId:"legacy",idLigue:"02",codeEntente:"02"}]}
  const result=planEntenteIds(input)
  assert.equal(result.mapping[0].newId,"0202")
  assert(result.cells.some(c=>c.column==="id_ligue" && c.before==="01" && c.after==="02"))
  assert(result.cells.some(c=>c.sheet==="CLUBS" && c.column==="id_entente" && c.after==="0202"))
  assert(result.issues.some(i=>i.kind==="REPARENT_REQUIRES_GEOGRAPHY_AND_SCOPE_REVIEW"))
  assert.equal(result.reviewable,false);assert.equal(result.executable,false)
})
