import {build} from "esbuild"
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"
import {chromium,expect} from "@playwright/test"
import {licencesFixture} from "../tests/licences-fixture.ts"
import {readFile,mkdir,writeFile} from "node:fs/promises"
import path from "node:path"
const output="test-results/licences"
await mkdir(output,{recursive:true})
const bundle=await build({entryPoints:["tests/ui/licences-entry.tsx"],bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"offline-navigation",setup(b){b.onResolve({filter:/^next\/(?:navigation|link|image)$/},a=>({path:path.resolve(a.path==="next/image"?"tests/ui/image-shim.tsx":"tests/ui/navigation-shim.tsx")}))}}]})
const font=(await readFile("app/fonts/geist-latin.woff2")).toString("base64")
const css=`@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}body{--font-geist-sans:Geist;}`+(await postcss([tailwind({base:process.cwd()})]).process(await readFile("app/globals.css","utf8"),{from:path.resolve("app/globals.css")})).css
const browser=await chromium.launch({headless:true}),checks=[],errors=[]
try{
 for(const width of [1440,390]){
  const f=await licencesFixture(),requests=[]
  await f.seedAthlete();await f.writeLicence(f.athleteInput)
  await f.write("athletes",{...f.input,nom_complet:"Second athlete",id_sexe:"FECOT-SEX-002"});await f.writeAffiliation(f.affiliationInput,"athletes","ATH00002")
  await f.write("arbitres");await f.writeLicence(f.actorInput,"acteurs")
  await f.write("coachs");await f.writeAffiliation(f.affiliationInput,"coachs","COA-0001")
  const page=await browser.newPage({viewport:{width,height:1000}});page.setDefaultTimeout(15000);page.on("pageerror",error=>errors.push(error.message))
  await page.route("**/*",async route=>{const req=route.request(),url=new URL(req.url());if(url.hostname!=="fecot-qa.test")return route.abort();const match=url.pathname.match(/^\/api\/licences\/([^/]+)$/);if(match){requests.push(`${req.method()} ${url.pathname}${url.search}`);const request=new Request(req.url(),{method:req.method(),...(req.method()==="GET"?{}:{body:req.postData()})}),response=req.method()==="GET"?await f.api.licencesGet(match[1],request):await f.api.licencesWrite(match[1],request);return route.fulfill({status:response.status,json:await response.json()})}return route.fulfill({contentType:"text/html",body:'<html lang="fr"><body><div id="root"></div></body></html>'})})
  await page.goto("http://fecot-qa.test/");await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text})
  const select=async(label,value,scope=page)=>{await scope.getByRole("combobox",{name:label,exact:true}).click();await page.getByRole("option",{name:value,exact:true}).click()}
  const searchSelect=async(label,query,result,scope=page)=>{await scope.getByRole("textbox",{name:label,exact:true}).fill(query);await page.getByRole("button",{name:result}).click()}
  const close=async()=>{await page.locator("form").getByRole("button",{name:/^(Fermer|Annuler)$/}).click();await expect(page.getByRole("dialog")).toHaveCount(0)}
  await expect(page.getByRole("heading",{name:"Licences — Athlètes",exact:true})).toBeVisible()
  await expect(page.getByText(/^N-001(?: ·|$)/).filter({visible:true})).toBeVisible()
  await expect(page.getByRole("table",{name:"Synthèse territoriale"})).toBeVisible()
  await expect(page.getByText("Non actives",{exact:true}).first()).toBeVisible()
  await expect(page.getByText("Expirées / clôturées",{exact:true})).toHaveCount(0)
  const beforeFilters=requests.length
  await select("Toutes les ligues","Ligue Test A");await select("Toutes les ententes","Entente Test A");await select("Tous les clubs","Club Test Alpha")
  await select("Toutes les ligues","Ligue Test B");await expect(page.getByRole("combobox",{name:"Toutes les ententes",exact:true})).toHaveText("Toutes les ententes");await expect(page.getByRole("combobox",{name:"Tous les clubs",exact:true})).toHaveText("Tous les clubs")
  await select("Toutes les ligues","Toutes les ligues");expect(requests.length).toBe(beforeFilters)
  const search=page.getByPlaceholder("Nom, identifiant ou numéro de licence…");await search.fill("N-001");await expect(page.getByText("sur 1 résultat",{exact:true})).toBeVisible();await search.fill("")
  const beforeOpen=requests.length
  await page.getByRole("button",{name:"Enregistrer une licence",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();expect(requests.length).toBe(beforeOpen)
  let dialog=page.getByRole("dialog")
  await searchSelect("Club *","Cl",/^Club Test Alpha/,dialog);await searchSelect("Athlète affilié *","Se",/^Second athlete/,dialog)
  await dialog.getByLabel("Numéro officiel *",{exact:true}).fill("N-002");await dialog.getByLabel("Délivrée le *",{exact:true}).fill("01012026")
  await dialog.getByRole("button",{name:"Enregistrer la licence",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByText(/^N-002(?: ·|$)/).filter({visible:true})).toBeVisible()
  await page.getByRole("button",{name:"Modifier la licence N-002",exact:true}).filter({visible:true}).click();dialog=page.getByRole("dialog")
  await expect(dialog.getByRole("combobox",{name:"Saison *",exact:true})).toBeDisabled()
  await dialog.getByLabel("Numéro officiel *",{exact:true}).fill("N-002-M");await dialog.getByRole("button",{name:"Enregistrer les modifications",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByText(/^N-002-M(?: ·|$)/).filter({visible:true})).toBeVisible()
  await page.getByRole("button",{name:"Consulter la licence N-002-M",exact:true}).filter({visible:true}).click();dialog=page.getByRole("dialog")
  await expect(dialog.getByLabel("Numéro officiel *",{exact:true})).toBeDisabled();await close()
  await page.getByRole("button",{name:"Renouveler par club",exact:true}).click();dialog=page.getByRole("dialog")
  await select("Saison *","2027",dialog);await searchSelect("Club *","Cl",/^Club Test Alpha/,dialog);await dialog.getByLabel("Délivrée le *",{exact:true}).fill("01012027")
  await dialog.getByRole("button",{name:"Tout sélectionner",exact:true}).click();const beforeRenew=f.state.writes.length
  await dialog.getByRole("button",{name:"Renouveler 2 licence(s)",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByRole("button",{name:"Actualiser les licences",exact:true})).toBeEnabled();expect(f.state.writes.length).toBe(beforeRenew+1)
  await select("Toutes les saisons","2027");await expect(page.getByText("sur 2 résultats",{exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.evaluate(()=>window.scrollTo(0,0));await expect(page.getByRole("heading",{name:"Licences — Athlètes",exact:true})).toBeInViewport()
  await page.screenshot({path:`${output}/athletes-${width}.png`,fullPage:true});checks.push({width,athleteList:true,filters:true,zeroClub:true,create:true,edit:true,view:true,renewClub:true,instantForm:true})
  f.state.canWrite=false;await page.evaluate(()=>window.qaLicences("athletes",false));await expect(page.getByText(/^N-001(?: ·|$)/).filter({visible:true})).toBeVisible();await expect(page.getByRole("button",{name:"Enregistrer une licence",exact:true})).toHaveCount(0);await expect(page.getByRole("button",{name:/^Modifier la licence/})).toHaveCount(0)
  f.state.canWrite=true;await page.evaluate(()=>window.qaLicences("acteurs",true));await expect(page.getByRole("heading",{name:"Licences — Entourage",exact:true})).toBeVisible();await expect(page.getByText(/^ARB-N-001(?: ·|$)/).filter({visible:true})).toBeVisible()
  await expect(page.getByText("Répartition par type",{exact:true})).toBeVisible();await expect(page.getByText("Échéances",{exact:true})).toBeVisible()
  await select("Toutes échéances","Sous 30 jours");await expect(page.getByText("sur 0 résultat",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Réinitialiser",exact:true}).click()
  await page.getByRole("button",{name:"Enregistrer une licence",exact:true}).click();dialog=page.getByRole("dialog")
  await select("Type d’acteur *","Entraîneur",dialog);await searchSelect("Acteur *","Sy",/^Synthetic actor/,dialog)
  await select("Affiliation *","Synthetic actor — Club Test Alpha",dialog);await select("Cycle *","SPORTIF",dialog)
  await dialog.getByLabel("Numéro officiel *",{exact:true}).fill("COA-N-001")
  for(const [label,value]of [["Délivrée le *","01012026"],["Début de validité *","01012026"],["Expiration *","31122099"]])await dialog.getByLabel(label,{exact:true}).fill(value)
  await dialog.getByRole("button",{name:"Enregistrer la licence",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByText(/^COA-N-001(?: ·|$)/).filter({visible:true})).toBeVisible()
  page.once("dialog",d=>d.accept());await select("Actions pour la licence COA-N-001","Suspendre")
  await expect(page.getByText("SUSPENDUE",{exact:true}).filter({visible:true})).toBeVisible()
  page.once("dialog",d=>d.accept());await select("Actions pour la licence COA-N-001","Réactiver")
  await expect(page.getByText("SUSPENDUE",{exact:true}).filter({visible:true})).toHaveCount(0)
  await select("Actions pour la licence COA-N-001","Renouveler");dialog=page.getByRole("dialog")
  await select("Affiliation *","Synthetic actor — Club Test Alpha",dialog);await dialog.getByLabel("Délivrée le *",{exact:true}).fill("01012100");await dialog.getByLabel("Expiration *",{exact:true}).fill("31122100")
  await dialog.getByRole("button",{name:"Renouveler la licence",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByText("A VENIR",{exact:true}).filter({visible:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.evaluate(()=>window.scrollTo(0,0));await expect(page.getByRole("heading",{name:"Licences — Entourage",exact:true})).toBeInViewport()
  await page.screenshot({path:`${output}/entourage-${width}.png`,fullPage:true});checks.push({width,actorList:true,actorCreate:true,suspend:true,reactivate:true,renew:true,dueFilters:true,readOnly:true,noOverflow:true})
  f.state.books.REFS.SAISON[1][4]="TEST-SCLOSED";f.api.invalidateActorSource();await page.evaluate(()=>window.qaLicences())
  await expect(page.getByText(/^N-001(?: ·|$)/).filter({visible:true}).first()).toBeVisible()
  await select("Toutes les saisons","2026")
  await expect(page.getByText("CLOTUREE",{exact:true}).filter({visible:true}).first()).toBeVisible()
  const beforeSeasonOpen=requests.length
  await page.getByRole("button",{name:"Enregistrer une licence",exact:true}).click();dialog=page.getByRole("dialog")
  expect(requests.length).toBe(beforeSeasonOpen)
  await expect(dialog.getByRole("button",{name:"Enregistrer la licence",exact:true})).toBeDisabled()
  await dialog.getByRole("combobox",{name:"Saison *",exact:true}).click()
  await expect(page.getByRole("option",{name:"2026",exact:true})).toHaveCount(0)
  await page.getByRole("option",{name:"2027",exact:true}).click()
  await expect(dialog.getByRole("status")).toContainText("PLANIFIEE")
  await expect(dialog.getByRole("status")).toContainText("01/01/2027")
  await close()
  await page.screenshot({path:`${output}/season-closed-${width}.png`,fullPage:true})
  checks.push({width,closedSeasonRead:true,closedSeasonNotIssuable:true,plannedSeasonAvailable:true,instantSeasonOptions:true})
  f.state.failRead="LIC";f.api.invalidateActorSource();await page.evaluate(()=>window.qaLicences())
  await expect(page.getByRole("alert")).toBeVisible();await expect(page.getByRole("button",{name:"Réessayer",exact:true})).toBeVisible();await expect(page.getByText("Synthèse territoriale",{exact:true})).toHaveCount(0)
  f.state.failRead="";f.state.books.LIC.ATHLETE_LICENCES=[f.state.books.LIC.ATHLETE_LICENCES[0]];f.state.books.REFS.STATUT_LICENCE=[["id_statut_licence","nom_statut_licence"]];f.api.invalidateActorSource();await page.evaluate(()=>window.qaLicences())
  await expect(page.getByRole("alert").filter({hasText:"STATUT_LICENCE est vide"})).toBeVisible();await page.getByRole("button",{name:"Enregistrer une licence",exact:true}).click();await expect(page.getByRole("dialog").getByRole("button",{name:"Enregistrer la licence",exact:true})).toBeDisabled();await close()
  checks.push({width,sourceFailure:true,emptyReferences:true});await page.close()
 }
 expect(errors).toEqual([])
}finally{await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify({checks,errors,noGoogle:true},null,2))}
console.log(JSON.stringify({passed:checks.length,errors}))
