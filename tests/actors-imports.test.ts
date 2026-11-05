import test from "node:test"
import assert from "node:assert/strict"
import {build} from "esbuild"

test("the former athlete detail import resolves to the shared actor detail component",async()=>{
 const result=await build({stdin:{contents:'export {AthleteDetailView} from "./components/actors/athlete-detail-view"; export {ActorDetailView} from "./components/actors/actor-detail-view";',resolveDir:process.cwd()},bundle:true,write:false,platform:"browser",jsx:"automatic",logLevel:"silent"})
 assert(result.outputFiles[0].text.length>0)
})
