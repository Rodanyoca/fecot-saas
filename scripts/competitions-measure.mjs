// Offline measurements of the implemented path. Not a historical before/after or Vercel estimate.
import {competitionsFixture} from "../tests/competitions-fixture.ts"
import {mkdir,writeFile} from "node:fs/promises"
import assert from "node:assert/strict"
const f=await competitionsFixture(),s=await f.setup(),samples=[]
// Add synthetic foreign competition data directly to the in-memory source, never Google.
const book=f.state.books.COMP
for(let i=0;i<50;i++)for(const name of ["COMPETITIONS","COMPETITIONS_EPREUVES","COMPETITIONS_PARTICIPANTS","COMPETITIONS_UNITES","COMPETITIONS_PHASES","COMPETITIONS_GROUPES","COMPETITIONS_PHASES_UNITES"]){const base=book[name].slice(1).map(row=>row.map(cell=>typeof cell==="string"&&cell.startsWith("FECOT-")?`${cell}-OTHER-${i}`:cell));book[name].push(...base.slice(0,2))}
f.api.invalidateCompetitionSource()
const run=async(fresh,record)=>{
 const reads=f.state.reads.length,metadata=f.metadataReads.length,cpu=process.cpuUsage(),start=performance.now(),response=await f.readCompetition(s.id,"engagements",fresh?"?fresh=1":""),text=await response.text(),elapsedMs=performance.now()-start,used=process.cpuUsage(cpu),json=JSON.parse(text)
 assert.equal(response.status,200);assert.equal(json.entities.engagement.length,2);assert.equal(json.entities.unite.length,2);assert.equal(text.includes("PRIVATE-PASSPORT"),false)
 const calls=f.state.reads.slice(reads);let rowsRead=0
 for(const call of calls){const colon=call.indexOf(":"),id=call.slice(0,colon);for(const match of call.slice(colon+1).matchAll(/'([^']+)'!/g))rowsRead+=Math.max(0,(f.state.books[id]?.[match[1]]?.length||1)-1)}
 if(record)samples.push({mode:fresh?"fresh":"warm",cpuMs:(used.user+used.system)/1000,elapsedMs,sheetsValueCalls:calls.length,sheetsMetadataCalls:f.metadataReads.length-metadata,driveCalls:0,sourceRowsRead:rowsRead,projectedBusinessRows:json.entities.engagement.length+json.entities.unite.length,responseBytes:Buffer.byteLength(text)})
 return json
}
await run(false,false);await run(true,false)
for(let i=0;i<5;i++){const a=await run(i%2===0,true),b=await run(i%2!==0,true);assert.deepEqual(a,b)}
await mkdir("test-results/competitions",{recursive:true});await writeFile("test-results/competitions/measures.json",JSON.stringify({kind:"offline fresh/warm comparison, not historical before/after",population:{competitions:book.COMPETITIONS.length-1,engagements:book.COMPETITIONS_PARTICIPANTS.length-1,units:book.COMPETITIONS_UNITES.length-1},warmup:2,samples,noProductionTraffic:true},null,2));console.log(JSON.stringify(samples))
