import {build} from "esbuild"
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"
import {chromium,expect} from "@playwright/test"
import {competitionsFixture} from "../tests/competitions-fixture.ts"
import {readFile,mkdir,writeFile} from "node:fs/promises"
import path from "node:path"
const output="test-results/competitions"
await mkdir(output,{recursive:true})
const bundle=await build({entryPoints:["tests/ui/competitions-entry.tsx"],bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"offline-navigation",setup(b){b.onResolve({filter:/^next\/(?:navigation|link|image)$/},a=>({path:path.resolve(a.path==="next/image"?"tests/ui/image-shim.tsx":"tests/ui/competitions-navigation.tsx")}))}}]})
const font=(await readFile("app/fonts/geist-latin.woff2")).toString("base64")
const css=`@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}body{--font-geist-sans:Geist;}`+(await postcss([tailwind({base:process.cwd()})]).process(await readFile("app/globals.css","utf8"),{from:path.resolve("app/globals.css")})).css
const browser=await chromium.launch({headless:true}),checks=[],errors=[]
try{
 for(const width of [1440,390]){
  const f=await competitionsFixture(),s=await f.setup(),requests=[]
  const page=await browser.newPage({viewport:{width,height:1000}});page.setDefaultTimeout(20000);page.on("pageerror",e=>errors.push(e.message))
  let hold=null
  await page.route("**/*",async route=>{const req=route.request(),url=new URL(req.url());if(url.hostname!=="fecot-qa.test")return route.abort();const match=url.pathname.match(/^\/api\/competitions(?:\/([^/]+))?(?:\/([^/]+))?$/);if(match){requests.push(`${req.method()} ${url.pathname}${url.search}`);if(hold&&match[2]===hold.section){const wait=hold;hold=null;wait.started();await wait.promise}const request=new Request(req.url(),{method:req.method(),...(req.method()==="GET"?{}:{body:req.postData()})}),response=req.method()==="GET"?await f.api.competitionsGet(request,match[1],match[2]):await f.api.competitionsWrite(request,match[1],match[2]);return route.fulfill({status:response.status,json:await response.json()})}return route.fulfill({contentType:"text/html",body:'<html lang="fr"><body><div id="root"></div></body></html>'})})
  await page.goto("http://fecot-qa.test/competitions");await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text})
  await expect(page.getByRole("link",{name:`Consulter ${f.competition.nom_competition}`,exact:true}).filter({visible:true})).toBeVisible()
  expect(requests).toHaveLength(1)
  for(const label of ["Saison","Pays","Statut"])await expect(page.getByRole("combobox",{name:label,exact:true})).toBeVisible()
  await page.screenshot({path:`${output}/${width}-liste.png`,fullPage:true})
  const search=page.getByPlaceholder("Rechercher une compétition...");await search.fill("inconnu");await expect(page.getByText("sur 0 résultat",{exact:true})).toBeVisible();await search.fill("");expect(requests).toHaveLength(1)
  await page.getByRole("button",{name:"Créer une compétition",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();expect(requests).toHaveLength(1)
  const modal=page.getByRole("dialog");const bounds=await modal.boundingBox();expect(Math.abs(bounds.x+bounds.width/2-width/2)).toBeLessThan(3)
  await page.screenshot({path:`${output}/${width}-creation.png`,fullPage:true})
  await modal.getByRole("button",{name:"Annuler",exact:true}).click()
  await page.getByRole("link",{name:`Consulter ${f.competition.nom_competition}`,exact:true}).filter({visible:true}).click()
  await expect(page.getByRole("region",{name:"Informations générales",exact:true})).toBeVisible();expect(requests).toHaveLength(2)
  await expect(page.getByRole("region",{name:"Organisation",exact:true})).toBeVisible()
  await page.screenshot({path:`${output}/${width}-general.png`,fullPage:true})
  await page.getByRole("tab",{name:"Athlètes engagés",exact:true}).click();await expect(page.getByText("sur 2 résultats",{exact:true}).first()).toBeVisible()
  expect(requests.filter(r=>r.includes("/engagements"))).toHaveLength(1);expect(requests.some(r=>r.includes("/resultats"))).toBe(false)
  await page.getByRole("button",{name:"Ajouter — Engagement",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();await expect(page.getByRole("dialog").getByLabel("Club *",{exact:true})).toBeEnabled()
  const beforeTyping=requests.length;await page.getByRole("dialog").getByLabel("Club *",{exact:true}).fill("Cl");await expect(page.getByRole("button",{name:/Club Alpha/})).toBeVisible();expect(requests).toHaveLength(beforeTyping)
  await page.getByRole("dialog").getByRole("button",{name:"Annuler",exact:true}).click()
  const beforeReturn=requests.length;await page.getByRole("tab",{name:"Général",exact:true}).click();await expect(page.getByRole("region",{name:"Informations générales",exact:true})).toBeVisible();expect(requests).toHaveLength(beforeReturn)
  let release,started;const pending=new Promise(resolve=>{started=resolve});hold={section:"resultats",started,promise:new Promise(resolve=>{release=resolve})}
  await page.getByRole("tab",{name:"Résultats",exact:true}).click();await pending;await expect(page.getByRole("status").filter({hasText:"Chargement de la section"})).toBeVisible();await expect(page.getByRole("region",{name:"Informations générales",exact:true})).toHaveCount(0)
  await page.getByRole("tab",{name:"Épreuves",exact:true}).click();await expect(page.getByRole("region",{name:"Épreuves",exact:true})).toBeVisible();release();await page.waitForTimeout(150);await expect(page.getByRole("heading",{name:"Résultats de combat",exact:true})).toHaveCount(0)
  await page.getByRole("button",{name:"Modifier "+s.event,exact:true}).filter({visible:true}).click();const dialog=page.getByRole("dialog");await dialog.getByLabel("Nom de l’épreuve *",{exact:true}).fill("Épreuve corrigée");await dialog.getByRole("button",{name:"Enregistrer",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0);await expect(page.getByText("Épreuve corrigée",{exact:true}).filter({visible:true}).first()).toBeVisible()
  await page.screenshot({path:`${output}/${width}-epreuves.png`,fullPage:true})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.getByRole("tab",{name:"Phases",exact:true}).click()
  await expect(page.getByText("Créer une phase",{exact:true})).toBeVisible()
  await expect(page.getByText("Créer un groupe",{exact:true})).toBeVisible()
  await page.screenshot({path:`${output}/${width}-phases.png`,fullPage:true})
  await page.getByRole("tab",{name:"Phases",exact:true}).focus();await page.keyboard.press("Home")
  await expect(page.getByRole("tab",{name:"Général",exact:true})).toHaveAttribute("aria-selected","true")
  await expect(page.getByRole("region",{name:"Organisation",exact:true})).toBeVisible()
  await page.getByRole("button",{name:"Modifier",exact:true}).click()
  await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible()
  await page.screenshot({path:`${output}/${width}-modification.png`,fullPage:true})
  await page.getByRole("dialog").getByRole("button",{name:"Annuler",exact:true}).click()
  f.state.canRead=false;await page.getByRole("button",{name:"Actualiser",exact:true}).click();await expect(page.getByRole("alert").filter({hasText:"HTTP 403"})).toBeVisible();await expect(page.getByRole("region",{name:"Organisation",exact:true})).toHaveCount(0)
  f.state.canRead=true;await page.getByRole("link",{name:"Retour à la liste",exact:true}).click();await expect(page.getByRole("button",{name:"Créer une compétition",exact:true})).toBeVisible()
  await page.getByRole("button",{name:"Créer une compétition",exact:true}).click();const create=page.getByRole("dialog")
  await create.getByLabel("Nom *",{exact:true}).fill("Création UI Test")
  for(const [label,value]of [["Type *","Championnat Test"],["Discipline *","Kyorugi"]]){await create.getByRole("combobox",{name:label,exact:true}).click();await page.getByRole("option",{name:value,exact:true}).click()}
  await create.getByLabel("Date de début *",{exact:true}).fill("01062026");await create.getByLabel("Date de fin *",{exact:true}).fill("03062026");await create.getByLabel("Pays *",{exact:true}).fill("CD");await create.getByRole("button",{name:"Créer",exact:true}).click()
  await expect(page.getByRole("dialog")).toHaveCount(0);await expect(page.getByRole("link",{name:"Consulter Création UI Test",exact:true}).filter({visible:true})).toBeVisible()
  checks.push({width,checks:["list/search/empty without requests","instant editor","detail distinct state","lazy sections","local tab cache","two-character local club search","late response discarded","confirmed edit refresh","403 clears data","no horizontal overflow","competition form creation confirmed","FEBACO list filter labels","centered creation dialog","two general cards","responsive tab band and keyboard","event cards and inline phase/group forms","wide edit sheet"],requests});await page.close()
 }
 expect(errors).toEqual([]);await writeFile(`${output}/results.json`,JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({scenarios:checks.length,errors}))
}finally{await browser.close()}
