import {build} from "esbuild"
import {chromium,expect} from "@playwright/test"
import {actorFields} from "../lib/actors/model.ts"
import {mkdir,writeFile} from "node:fs/promises"
const output="test-results/actor-editor-stability"
await mkdir(output,{recursive:true})
const bundle=await build({entryPoints:["tests/ui/actor-editor-entry.tsx"],bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'}})
const mobile=process.argv.includes("--mobile")
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}}),requests=[],navigations=[],errors=[]
page.setDefaultTimeout(5000)
page.on("pageerror",e=>errors.push(e.message))
let pendingWrite,pendingReferences,holdReferences=true,failReferences=false
const referenceData={fields:actorFields.filter(f=>["nom_complet","id_sexe","statut","email","date_naissance"].includes(f.key)),references:{SEXES:[{id:"FECOT-SEX-001",label:"MASCULIN"},{id:"FECOT-SEX-002",label:"FEMININ"}]}}
try{
 await page.route("**/*",async route=>{
  const req=route.request(),url=new URL(req.url());requests.push(`${req.method()} ${url.pathname}${url.search}`)
  if(url.hostname!=="fecot-editor.test")return route.abort()
  if(url.pathname==="/")return route.fulfill({contentType:"text/html",body:'<html><body><div id="root"></div></body></html>'})
  if(req.method()==="POST"){pendingWrite=route;return}
  if(holdReferences){pendingReferences=route;return}
  return route.fulfill({status:failReferences?503:200,json:failReferences?{error:{message:"Source indisponible de test"}}:referenceData})
 })
 await page.goto("http://fecot-editor.test/");page.on("framenavigated",frame=>{if(frame===page.mainFrame())navigations.push(frame.url())})
 await page.addScriptTag({content:bundle.outputFiles[0].text})
 await page.getByRole("button",{name:"Ajouter",exact:true}).click()
 const dialog=page.getByRole("dialog"),name=dialog.getByRole("textbox",{name:"Nom complet",exact:false})
 await expect.poll(()=>Boolean(pendingReferences)).toBe(true)
 // The sheet must appear complete once, never as an empty form rebuilt after a slow response.
 await expect(dialog).toHaveCount(0,{timeout:500})
 await expect(page.getByRole("button",{name:"Ouverture…",exact:true})).toBeDisabled()
 expect(requests.filter(r=>r.includes("references=1"))).toHaveLength(1)
 holdReferences=false;await pendingReferences.fulfill({json:referenceData})
 await name.fill("Athlète synthétique")
 await dialog.getByRole("combobox",{name:"Sexe",exact:false}).click();await page.getByRole("option",{name:"FEMININ",exact:true}).click()
 await dialog.getByLabel("E-mail").fill("test@example.invalid")
 await page.evaluate(()=>window.qaEditorRender());await expect(name).toHaveValue("Athlète synthétique")
 await dialog.getByRole("button",{name:"Enregistrer",exact:true}).click()
 await expect(name).toBeDisabled();await expect(name).toHaveValue("Athlète synthétique")
 expect(pendingWrite).toBeTruthy()
 await pendingWrite.fulfill({status:422,json:{error:{message:"Validation synthétique",fields:{nom_complet:"Erreur de test"}}}})
 await expect(dialog.getByRole("alert")).toContainText("Validation synthétique");await expect(name).toHaveValue("Athlète synthétique")
 expect(navigations).toEqual([]);expect(requests.filter(r=>r.includes("references=1"))).toHaveLength(1);expect(errors).toEqual([])
 await dialog.getByRole("button",{name:"Fermer",exact:true}).last().click()
 failReferences=true;await page.getByRole("button",{name:"Ajouter",exact:true}).click()
 await expect(page.getByRole("alert")).toContainText("Source indisponible de test");await expect(dialog).toHaveCount(0)
 await expect(page.getByRole("button",{name:"Ajouter",exact:true})).toBeEnabled()
 failReferences=false;await page.getByRole("button",{name:"Ajouter",exact:true}).click()
 await expect(name).toHaveValue("");await expect(page.getByRole("alert")).toHaveCount(0)
 expect(requests.filter(r=>r.includes("references=1"))).toHaveLength(3);expect(navigations).toEqual([])
 console.log(JSON.stringify({mobile,completeFormOnOpen:true,openingFailureAndRetry:true,typingAndSelectStable:true,parentRenderStable:true,pendingWriteStable:true,validationRetainsInput:true,navigations,requests,errors}))
}finally{await browser.close();await writeFile(`${output}/run-${mobile?"mobile":"desktop"}.json`,JSON.stringify({navigations,requests,errors},null,2))}
