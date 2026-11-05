import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {competitionSourceError} from "../lib/competitions/source-error.ts"
test("Google source diagnostics distinguish provider failures without exposing private data",()=>{
 for(const [status,reason,expected]of [[403,"forbidden","GOOGLE_ACCESS_DENIED"],[403,"SERVICE_DISABLED","GOOGLE_API_DISABLED"],[403,"rateLimitExceeded","GOOGLE_QUOTA"],[429,"","GOOGLE_QUOTA"],[404,"","GOOGLE_SOURCE_NOT_FOUND"],[401,"","GOOGLE_AUTH_FAILED"],[504,"","GOOGLE_SOURCE_TIMEOUT"],[500,"","GOOGLE_SOURCE_UNAVAILABLE"]]as const){
  const result=competitionSourceError({message:"PRIVATE-TOKEN",response:{status,data:{error:{message:"PRIVATE-TOKEN",errors:[{reason}],details:[{reason}]}}}},"FECOT_COMPETITIONS_SPREADSHEET_ID")
  assert.equal(result.code,expected);assert.equal(result.status,503);assert.match(result.message,/FECOT_COMPETITIONS_SPREADSHEET_ID/);assert.equal(result.message.includes("PRIVATE-TOKEN"),false)
 }
 const result=competitionSourceError({code:"ETIMEDOUT"},"PRIVATE-TOKEN");assert.equal(result.code,"GOOGLE_SOURCE_TIMEOUT");assert.equal(result.message.includes("PRIVATE-TOKEN"),false)
})
