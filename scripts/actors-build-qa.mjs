// Normal build in an existing isolated dependency tree; never loads production .env.
import fs from "node:fs"
import path from "node:path"
import {spawn} from "node:child_process"
import {createHash} from "node:crypto"
const root=process.cwd(),target=path.resolve("node_modules/.cache/fecot-entente-build-20261102"),proof=path.resolve("test-results/actors-audit-20261102"),files=[]
function collect(dir){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const rel=path.join(dir,e.name);if(e.isDirectory())collect(rel);else files.push(rel)}}
for(const dir of ["app","components","lib"])collect(dir)
files.push("next.config.mjs","package.json","package-lock.json","tsconfig.json")
const hash=(base,rel)=>createHash("sha256").update(fs.readFileSync(path.join(base,rel))).digest("hex")
const before=Object.fromEntries(files.map(rel=>[rel,hash(target,rel)]))
for(const rel of files)if(hash(root,rel)!==before[rel])throw Error("Build source mismatch: "+rel)
if(fs.readdirSync(target).some(p=>p.startsWith(".env")))throw Error("Environment files forbidden in isolated build")
const env={...process.env,NEXT_TELEMETRY_DISABLED:"1"}
for(const key of Object.keys(env))if(/^(GOOGLE_|AUTH_|FECOT_|NEXT_FONT_GOOGLE_MOCKED_RESPONSES$|NEXT_DIST_DIR$|NODE_OPTIONS$)/.test(key))delete env[key]
const log=fs.createWriteStream(path.join(proof,"build.log")),start=Date.now()
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","build"],{cwd:target,env,windowsHide:true,stdio:["ignore","pipe","pipe"]})
for(const stream of [child.stdout,child.stderr])stream.on("data",data=>log.write(data))
const code=await new Promise((resolve,reject)=>{child.on("error",reject);child.on("close",resolve)})
await new Promise(resolve=>log.end(resolve))
const after=Object.fromEntries(files.map(rel=>[rel,hash(target,rel)]))
const result={exit:code,elapsedMs:Date.now()-start,sourceFiles:files.length,unchanged:JSON.stringify(before)===JSON.stringify(after),noProductionCredentials:true,normalBuild:true}
fs.writeFileSync(path.join(proof,"build.json"),JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=code
