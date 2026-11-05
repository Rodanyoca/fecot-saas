// Sequential local checks; preserve all output and exit codes without changing source configuration.
import {spawn} from "node:child_process"
import {mkdir,readFile,writeFile} from "node:fs/promises"
const output="test-results/competitions";await mkdir(output,{recursive:true});const selected=process.argv.slice(2),results=selected.length?JSON.parse(await readFile(`${output}/validation.json`,"utf8").catch(()=>"[]")):[]
for(const [name,args]of [["tests",["--experimental-strip-types","--test","--test-concurrency=2","tests/*.test.ts","tests/unit/*.test.ts","tests/integration/*.test.ts"]],["typescript",["node_modules/typescript/bin/tsc","--noEmit"]],["lint",["node_modules/typescript/bin/tsc","--noEmit"]]].filter(([name])=>!selected.length||selected.includes(name))){
 const start=performance.now(),child=spawn(process.execPath,args,{cwd:process.cwd(),windowsHide:true,stdio:["ignore","pipe","pipe"]});let log="";for(const stream of [child.stdout,child.stderr])stream.on("data",chunk=>{log+=chunk;process.stdout.write(chunk)})
 const exit=await new Promise((resolve,reject)=>{child.on("error",reject);child.on("close",resolve)});await writeFile(`${output}/${name}.log`,log);const previous=results.findIndex(r=>r.name===name);if(previous>=0)results.splice(previous,1);results.push({name,exit,elapsedMs:performance.now()-start,...(name==="lint"?{note:"package lint is an alias of typecheck; no independent ESLint configuration"}:{})});await writeFile(`${output}/validation.json`,JSON.stringify(results,null,2));if(exit){process.exitCode=exit;break}
}
