import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {actorAge,actorSex} from "../lib/actors/presentation.ts"

test("actor age follows birthday and accepts source ISO, French, compact and Sheets serial dates",()=>{
 const today=new Date(2026,10,2)
 assert.equal(actorAge("2000-11-02",today),26)
 assert.equal(actorAge("2000-11-03",today),25)
 assert.equal(actorAge("02/11/2000",today),26)
 assert.equal(actorAge("02112000",today),26)
 assert.equal(actorAge("36832",today),26)
 for(const value of ["",undefined,"invalid","junk02112000","31022000","2027-01-01"])assert.equal(actorAge(value,today),null)
})

test("actor sex presentation never defaults unknown values to male",()=>{
 assert.equal(actorSex("MASCULIN"),"M");assert.equal(actorSex("FEMININ"),"F")
 assert.equal(actorSex("F"),"F");assert.equal(actorSex("unknown"),"unknown");assert.equal(actorSex(""),"—")
})
