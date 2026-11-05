import {build} from "esbuild"
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"
import {chromium,expect} from "@playwright/test"
import {affiliationsFixture} from "../tests/affiliations-fixture.ts"
import {readFile,mkdir,writeFile} from "node:fs/promises"
import path from "node:path"
const output=process.argv.includes("--error-only")?"test-results/affiliations-503":"test-results/affiliations"
await mkdir(output,{recursive:true})
const bundle=await build({entryPoints:["tests/ui/affiliations-entry.tsx"],bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"offline-navigation",setup(b){b.onResolve({filter:/^next\/(?:navigation|link)$/},()=>({path:path.resolve("tests/ui/navigation-shim.tsx")}))}}]})
const font=(await readFile("app/fonts/geist-latin.woff2")).toString("base64")
const css=`@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}body{--font-geist-sans:Geist;}`+(await postcss([tailwind({base:process.cwd()})]).process(await readFile("app/globals.css","utf8"),{from:path.resolve("app/globals.css")})).css
const browser=await chromium.launch({headless:true}),checks=[],errors=[]
const actors={athletes:"ATH00001",coachs:"COA-0001",medecins:"MED0001",officiels:"OFF0001","autres-acteurs":"AUT0001"}
try{
 for(const width of [1440,390]){
  const f=await affiliationsFixture(),requests=[];let htmlFailure=false,authFailure=false,refreshGate=null
  for(const kind of Object.keys(actors))await f.write(kind)
  const page=await browser.newPage({viewport:{width,height:1000}})
  page.on("pageerror",error=>errors.push(error.message));page.setDefaultTimeout(15000)
  await page.route("**/*",async route=>{
   const req=route.request(),url=new URL(req.url())
   if(url.hostname!=="fecot-qa.test")return route.abort()
   const match=url.pathname.match(/^\/api\/affiliations\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/)
   if(match){if(authFailure)return route.fulfill({status:503,json:{error:"Service d’authentification indisponible."}});if(htmlFailure)return route.fulfill({status:404,contentType:"text/html",body:'<!DOCTYPE html><html><body>Not found</body></html>'});requests.push(`${req.method()} ${url.pathname}${url.search}`);if(refreshGate&&req.method()==="GET"&&url.searchParams.get("fresh")==="1")await refreshGate;const request=new Request(req.url(),{method:req.method(),...(req.method()==="GET"?{}:{body:req.postData()})}),response=req.method()==="GET"?await f.api.affiliationsGet(match[1],match[2],request):await f.api.affiliationsWrite(match[1],match[2],request,match[3]);return route.fulfill({status:response.status,json:await response.json()})}
   return route.fulfill({contentType:"text/html",body:'<html lang="fr"><body><div id="root"></div></body></html>'})
  })
  await page.goto("http://fecot-qa.test/");await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text})
  // Finish the harness's initial mount before counting an explicit remount.
  await expect(page.getByText("Aucune affiliation enregistrée.",{exact:true})).toBeVisible()
  if(process.argv.includes("--error-only")){
   authFailure=true;await page.evaluate(()=>window.qaAffiliations())
   await expect(page.getByRole("alert")).toContainText("Service d’authentification indisponible.")
   await expect(page.getByRole("alert")).toContainText("HTTP 503")
   checks.push({width,proxyErrorVisible:true});await page.close();continue
  }
  const select=async(label,value)=>{await page.getByRole("combobox",{name:label,exact:true}).click();await page.getByRole("option",{name:value,exact:true}).click()}
  for(const [kind,actorId] of Object.entries(actors)){
   requests.splice(0);await page.evaluate(({kind,actorId})=>window.qaAffiliations(kind,actorId),{kind,actorId})
   await expect(page.getByText("Aucune affiliation enregistrée.",{exact:true})).toBeVisible()
   expect(requests.filter(r=>r.includes("options=1"))).toHaveLength(0)
   expect(requests.filter(r=>r.includes("editor=1"))).toHaveLength(1)
   const beforeOpen=requests.length
   const refreshButton=page.getByRole("button",{name:"Actualiser les affiliations",exact:true})
   await expect(refreshButton).toBeEnabled()
   const refreshBox=await refreshButton.boundingBox(),addBox=await page.getByRole("button",{name:"Ajouter une affiliation",exact:true}).boundingBox()
   expect(refreshBox.x+refreshBox.width).toBeLessThanOrEqual(addBox.x)
   expect(Math.abs(refreshBox.y-addBox.y)).toBeLessThan(1)
   await page.getByRole("button",{name:"Ajouter une affiliation",exact:true}).click()
   await expect(page.getByRole("dialog")).toBeVisible()
   expect(requests.length).toBe(beforeOpen)
   await expect(page.getByText("Chargement des options…",{exact:true})).toHaveCount(0)
   await expect(page.getByRole("button",{name:"Créer",exact:true})).toBeEnabled()
   if(["athletes","coachs","medecins"].includes(kind)){
    const club=page.getByRole("textbox",{name:"Club",exact:true})
    await expect(page.getByRole("combobox",{name:"Club",exact:true})).toHaveCount(0)
    await club.focus();await expect(page.getByText("Saisissez au moins 2 caractères.",{exact:true})).toBeVisible()
    await club.fill("C");await expect(page.getByRole("button",{name:/Club Test Alpha/})).toHaveCount(0)
    await club.fill("ZZ");await expect(page.getByText("Aucun résultat.",{exact:true})).toBeVisible()
    await club.fill("Cl");await page.getByRole("button",{name:/Club Test Alpha/}).click()
    await expect(club).toHaveValue("Club Test Alpha");expect(requests.length).toBe(beforeOpen)
    await expect(page.getByText("Équipe",{exact:true})).toHaveCount(0)
   }
   else {await select("Type d’entité","CLUB");await select("Entité","Club Test Alpha")}
   if(kind==="officiels")await select("Fonction","Fonction Test")
   if(kind==="autres-acteurs")await select("Saison","Saison Test")
   await page.getByLabel("Date de début",{exact:true}).fill("01012026");await select("Statut","Active")
   await page.getByRole("button",{name:"Créer",exact:true}).click()
   await expect(page.getByRole("dialog")).toHaveCount(0)
   await expect(page.getByText("Club Test Alpha",{exact:true}).filter({visible:true})).toBeVisible()
   await expect(page.getByPlaceholder("Rechercher une affiliation...")).toHaveCount(0)
   await expect(page.getByRole("combobox",{name:"Nombre de lignes par page"})).toHaveCount(0)
   await expect(page.getByRole("button",{name:"Page suivante",exact:true})).toHaveCount(0)
   const modify=page.getByRole("button",{name:/^Modifier /}).filter({visible:true})
   const beforeEdit=requests.length
   await modify.click()
   expect(requests.length).toBe(beforeEdit)
   if(["athletes","coachs","medecins"].includes(kind))await expect(page.getByRole("textbox",{name:"Club",exact:true})).toHaveValue("Club Test Alpha")
   await page.getByLabel("Date de fin (facultative)",{exact:true}).fill("31122026");await select("Statut","Terminée")
   await page.getByRole("button",{name:"Enregistrer",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0)
   await expect(page.getByText(/31\/12\/2026$/).filter({visible:true})).toBeVisible()
   expect(requests.filter(r=>r.includes("options=1"))).toHaveLength(0)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   await page.screenshot({path:`${output}/${kind}-${width}.png`,fullPage:true})
   f.state.canWrite=false
   await page.evaluate(({kind,actorId})=>window.qaAffiliations(kind,actorId,false),{kind,actorId})
   await expect(page.getByText("Club Test Alpha",{exact:true}).filter({visible:true})).toBeVisible()
   await expect(page.getByRole("button",{name:"Ajouter une affiliation",exact:true})).toHaveCount(0)
   await expect(page.getByRole("button",{name:/^Modifier /})).toHaveCount(0)
   await page.getByRole("button",{name:/^Consulter /}).filter({visible:true}).click()
   await expect(page.getByRole("dialog").getByText("Club Test Alpha",{exact:true})).toBeVisible()
   await expect(page.getByRole("button",{name:"Enregistrer",exact:true})).toHaveCount(0)
   await page.locator("form").getByRole("button",{name:"Fermer",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0)
   f.state.canWrite=true
   if(kind==="athletes"){
    const table=f.state.books.AFF.ATHLETE_AFFILIATIONS,headers=table[0]
    for(let i=0;i<12;i++)table.push(headers.map(key=>({id_affiliation_athlete:`TEST-HISTORY-${i}`,id_athlete:actorId,id_club:"C001",date_debut:`${2000+i}-01-01`,date_fin:`${2000+i}-12-31`,id_statut_affiliation:"TEST-END",observations:""})[key]||""))
    f.api.invalidateActorSource()
    let release;refreshGate=new Promise(resolve=>{release=resolve})
    const beforeRefresh=requests.length,refresh=page.getByRole("button",{name:"Actualiser les affiliations",exact:true})
    try{
     await refresh.click();await expect(refresh).toBeDisabled();await expect(refresh.locator("svg")).toHaveClass(/animate-spin/)
     expect(requests.length).toBe(beforeRefresh+1)
     expect(requests.at(-1)).toContain("fresh=1")
    }finally{release();refreshGate=null}
    await expect(refresh).toBeEnabled()
    await expect(page.getByRole("button",{name:/^Consulter /}).filter({visible:true})).toHaveCount(13)
    expect(requests.length).toBe(beforeRefresh+1)
    await page.screenshot({path:`${output}/all-history-${width}.png`,fullPage:true})
    checks.push({width,manualRefresh:true,loadingSpinner:true,singleRequest:true,all13Visible:true,noSearch:true,noPagination:true})
   }
   checks.push({width,kind,empty:true,create:true,edit:true,view:true,readOnly:true,noTeams:true,lazyOptions:true,noOverflow:true})
  }
  f.state.books.REFS.STATUTS_AFFILIATION=[["id_statut_affiliation","nom_statut_affiliation"]];f.api.invalidateActorSource()
  await page.evaluate(()=>window.qaAffiliations());await expect(page.getByText("Club Test Alpha",{exact:true}).filter({visible:true}).first()).toBeVisible()
  await page.getByRole("button",{name:"Ajouter une affiliation",exact:true}).click()
  await expect(page.getByRole("alert").filter({hasText:"STATUTS_AFFILIATION est vide"})).toBeVisible();await expect(page.getByRole("button",{name:"Créer",exact:true})).toBeDisabled()
  await page.locator("form").getByRole("button",{name:"Fermer",exact:true}).click()
  f.state.failRead="AFF";f.api.invalidateActorSource();await page.evaluate(()=>window.qaAffiliations())
  await expect(page.getByRole("alert")).toBeVisible();await expect(page.getByRole("button",{name:"Réessayer",exact:true})).toBeVisible()
  checks.push({width,missingReferencesBlocked:true,sourceFailureVisible:true})
  htmlFailure=true;await page.evaluate(()=>window.qaAffiliations())
  await expect(page.getByRole("alert")).toContainText("Réponse du service indisponible")
  await expect(page.getByRole("alert")).not.toContainText("Unexpected token")
  checks.push({width,html404Handled:true})
  await page.close()
 }
 expect(errors).toEqual([])
}finally{await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify({checks,errors,noGoogle:true},null,2))}
console.log(JSON.stringify({passed:checks.length,errors}))
