// Real components + real handlers/services, mocked Google boundary. No production credentials.
import {build} from "esbuild"
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"
import {chromium,expect} from "@playwright/test"
import {licencesFixture as actorsFixture} from "../tests/licences-fixture.ts"
import {actorKinds,actorConfig} from "../lib/actors/model.ts"
import {readFile,mkdir,writeFile} from "node:fs/promises"
import path from "node:path"
const output="test-results/actors-audit-20261102"
const kinds=process.argv.includes("--athletes-only")?["athletes"]:process.argv.includes("--arbitres-only")?["arbitres"]:actorKinds
await mkdir(output,{recursive:true})
const bundle=await build({entryPoints:["tests/ui/actors-entry.tsx"],bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"offline-navigation",setup(b){b.onResolve({filter:/^next\/(?:navigation|link|image)$/},args=>({path:path.resolve(args.path==="next/image"?"tests/ui/image-shim.tsx":"tests/ui/navigation-shim.tsx")}))}}]})
const font=(await readFile("app/fonts/geist-latin.woff2")).toString("base64")
const generated=await postcss([tailwind({base:process.cwd()})]).process(await readFile("app/globals.css","utf8"),{from:path.resolve("app/globals.css")})
const styles=`@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}body{--font-geist-sans:Geist;}`+generated.css,browser=await chromium.launch({headless:true}),errors=[],checks=[]
try{
 for(const [device,width,height] of [["desktop",1440,1000],["mobile",390,844]]){
  const f=await actorsFixture(),requests=[];let detailGate=null,releaseDetail=null,failDetail=false
  for(const kind of kinds){const c=actorConfig[kind],table=f.state.books.ACTORS[c.sheet];for(let i=0;i<31;i++)table.push(table[0].map(h=>h===c.id?`TEST-${kind}-${i}`:h==="nom_complet"?`Acteur Test ${String(i).padStart(2,"0")}`:h==="id_sexe"?`FECOT-SEX-00${i%2+1}`:h==="statut"?"ACTIF":""))}
  const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(15000);page.on("pageerror",e=>errors.push(e.message))
  await page.route("**/*",async route=>{
   const req=route.request(),url=new URL(req.url())
   if(url.hostname!=="fecot-qa.test")return route.abort()
   if(url.pathname==="/api/auth/session")return route.fulfill({json:{user:{nom_complet:"Compte de test",est_super_admin:true}}})
   const licence=url.pathname.match(/^\/api\/licences\/([^/]+)$/)
   if(licence){requests.push(`${req.method()} ${url.pathname}${url.search}`);const response=await f.api.licencesGet(licence[1],new Request(req.url()));return route.fulfill({status:response.status,body:await response.text(),contentType:"application/json"})}
   const affiliation=url.pathname.match(/^\/api\/affiliations\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/)
   if(affiliation){requests.push(`${req.method()} ${url.pathname}${url.search}`);const request=new Request(req.url(),{method:req.method(),...(req.method()==="GET"?{}:{body:req.postData()})});const response=req.method()==="GET"?await f.api.affiliationsGet(affiliation[1],affiliation[2],request):await f.api.affiliationsWrite(affiliation[1],affiliation[2],request,affiliation[3]);return route.fulfill({status:response.status,body:await response.text(),contentType:"application/json"})}
   const match=url.pathname.match(/^\/api\/actors\/([^/]+)(?:\/([^/]+))?$/)
   if(match?.[2]&&detailGate)await detailGate
   if(match?.[2]&&failDetail){failDetail=false;return route.fulfill({status:503,json:{error:{message:"Fiche temporairement indisponible."}}})}
   if(match){requests.push(`${req.method()} ${url.pathname}${url.search}`);const request=new Request(req.url(),{method:req.method(),...(req.method()==="GET"?{}:{body:req.postData()})});const response=req.method()==="GET"?await f.api.actorsGet(match[1],request,match[2]):await f.api.actorsWrite(match[1],request,match[2]);return route.fulfill({status:response.status,body:await response.text(),contentType:"application/json"})}
   return route.fulfill({contentType:"text/html",body:'<html lang="fr"><body><div id="root"></div></body></html>'})
  })
  await page.goto("http://fecot-qa.test/");await page.addStyleTag({content:styles});await page.addScriptTag({content:bundle.outputFiles[0].text})
  for(const kind of kinds){
   await page.evaluate(kind=>window.qaActors(kind),kind)
   await expect(page.getByRole("heading",{name:actorConfig[kind].title,exact:true})).toHaveCount(1)
   await expect(page.getByText("sur 31 résultats",{exact:true})).toBeVisible()
   if(kind==="athletes"){
    await expect(page.getByRole("button",{name:"Trier par Niveau",exact:true})).toHaveCount(0)
    const sexAge=device==="desktop"?page.locator("tbody tr").first().locator("td").nth(3):page.locator("article").first()
    const sex=sexAge.getByText("M",{exact:true}),age=sexAge.getByText("—",{exact:true})
    await expect(sex).toBeVisible();await expect(age).toBeVisible()
    const sexBox=await sex.boundingBox(),ageBox=await age.boundingBox()
    expect(ageBox.y).toBeGreaterThanOrEqual(sexBox.y+sexBox.height-1)
    expect(Math.abs((sexBox.x+sexBox.width/2)-(ageBox.x+ageBox.width/2))).toBeLessThan(1)
   }
   if(device==="desktop"){
    const headerFonts=await page.getByRole("columnheader").evaluateAll(headers=>headers.map(header=>getComputedStyle(header).fontFamily))
    expect(headerFonts.every(font=>font.includes("Geist")&&!font.includes("Mono"))).toBe(true)
    const headerTransforms=await page.getByRole("columnheader").evaluateAll(headers=>headers.map(header=>getComputedStyle(header.querySelector("button")||header).textTransform))
    expect(headerTransforms.every(transform=>transform==="uppercase")).toBe(true)
    const expected={athletes:["Licence","Avatar","Nom complet","Sexe / âge","ID national","ID WT","Statut"],coachs:["Licence","Avatar","Nom complet","Niveau","Sexe / âge","ID national","ID WT","Statut"],arbitres:["Licence","Nom complet","Sexe / âge","Grade","ID national","ID WT","Statut"],officiels:["Licence","Avatar","Nom complet","Sexe / âge","ID national","ID WT","Statut"],medecins:["Licence","Avatar","Nom complet","Spécialité","Sexe / âge","ID national","ID WT","Statut"],"autres-acteurs":["Licence","Nom complet","Type","Sexe","Téléphone","Statut"]}
    expect((await page.getByRole("columnheader").allTextContents()).map(text=>text.trim())).toEqual([...expected[kind],"Actions"])
   }
   await page.screenshot({path:`${output}/actors-${kind}-list-${device}.png`,fullPage:true})
   const before=requests.length
   await page.getByRole("combobox",{name:"Nombre de lignes par page"}).click();await page.getByRole("option",{name:"25",exact:true}).click()
   await page.getByRole("button",{name:"Page suivante",exact:true}).click();await expect(page.getByText("Page 2 sur 2",{exact:true})).toBeVisible()
   await page.getByPlaceholder("Rechercher un acteur...").fill("Test 00");await expect(page.getByText("sur 1 résultat",{exact:true})).toBeVisible()
   expect(requests.length).toBe(before)
   await page.getByRole("combobox",{name:"Sexe",exact:true}).click();await page.getByRole("option",{name:"FEMININ",exact:true}).click()
   await expect(page.getByText("sur 0 résultat",{exact:true})).toBeVisible()
   await page.getByRole("combobox",{name:"Sexe",exact:true}).click();await page.getByRole("option",{name:"Tous",exact:true}).click()
   await expect(page.getByText("sur 1 résultat",{exact:true})).toBeVisible()
   if(device==="desktop"){await page.getByRole("button",{name:"Trier par Nom complet",exact:true}).click();await expect(page.getByRole("columnheader").filter({has:page.getByRole("button",{name:"Trier par Nom complet",exact:true})})).toHaveAttribute("aria-sort","ascending")}
   expect(requests.length).toBe(before)
   failDetail=true
   await page.getByRole("button",{name:"Voir Acteur Test 00",exact:true}).filter({visible:true}).click()
   await expect(page.getByRole("alert")).toHaveText("Fiche temporairement indisponible.")
   await expect(page.getByPlaceholder("Rechercher un acteur...")).toHaveCount(0)
   await expect(page.getByRole("tab",{name:"Général",exact:true})).toHaveCount(0)
   await page.getByRole("button",{name:"Retour à la liste",exact:true}).click()
   await page.getByPlaceholder("Rechercher un acteur...").fill("Test 00")
   detailGate=new Promise(resolve=>{releaseDetail=resolve})
   await page.getByRole("button",{name:"Voir Acteur Test 00",exact:true}).filter({visible:true}).click()
   try{
    await expect(page.getByRole("status").filter({hasText:"Chargement de la fiche"})).toBeVisible()
    await expect(page.getByPlaceholder("Rechercher un acteur...")).toHaveCount(0)
    await expect(page.getByRole("button",{name:"Ajouter",exact:true})).toHaveCount(0)
    await expect(page.getByRole("tab",{name:"Général",exact:true})).toHaveCount(0)
   }finally{releaseDetail();detailGate=null}
   await expect(page.getByRole("heading",{name:"Acteur Test 00",exact:true})).toHaveCount(1)
   expect(requests.some(r=>r.includes("section="))).toBe(false)
   const beforeEdit=requests.length
   await page.getByRole("button",{name:"Modifier",exact:true}).click()
   expect(requests.length).toBe(beforeEdit)
   await expect(page.getByRole("button",{name:"Ouverture…",exact:true})).toHaveCount(0)
   await expect(page.getByRole("dialog").getByLabel("Nom complet",{exact:false})).toHaveValue("Acteur Test 00")
   await page.getByRole("dialog").getByLabel("Nom complet",{exact:false}).fill(`Modifié ${kind}`)
   await page.getByRole("button",{name:"Enregistrer",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0)
   await expect(page.getByRole("heading",{name:`Modifié ${kind}`,exact:true})).toHaveCount(1)
   {
    const titles=kind==="autres-acteurs"?["Identité","Coordonnées","Observations"]:["Identité","Contact","Identifiants","Observations"]
    for(const title of titles)await expect(page.getByText(title,{exact:true})).toBeVisible()
    await expect(page.getByRole("tabpanel").locator('[data-slot="card"]')).toHaveCount(titles.length)
    await expect(page.getByText("Passeport",{exact:true})).toHaveCount(0)
    await expect(page.getByText("Document de passeport",{exact:true})).toHaveCount(0)
    await expect(page.getByRole("tab",{name:"Général",exact:true})).toBeVisible()
    await expect(page.getByRole("tab",{name:kind==="athletes"?"Licence":"Licences",exact:true})).toBeVisible()
    await expect(page.getByRole("button",{name:"Ajouter la photo",exact:true})).toBeVisible()
    if(kind!=="autres-acteurs")await expect(page.getByText("ID WT",{exact:true})).toBeVisible()
    await expect(page.getByText("Niveau taekwondo",{exact:true})).toHaveCount(0)
    const tabBoxes=await page.getByRole("tab").evaluateAll(tabs=>tabs.map(tab=>{const box=tab.getBoundingClientRect();return {top:box.top,width:box.width}}))
    expect(Math.max(...tabBoxes.map(box=>box.top))-Math.min(...tabBoxes.map(box=>box.top))).toBeLessThan(1)
    expect(Math.max(...tabBoxes.map(box=>box.width))-Math.min(...tabBoxes.map(box=>box.width))).toBeLessThan(1)
    await page.screenshot({path:`${output}/actors-${kind}-detail-${device}.png`,fullPage:true})
    if(kind==="athletes")await page.screenshot({path:`${output}/actors-detail-${device}.png`,fullPage:true})
    await page.getByRole("tab",{name:kind==="arbitres"?"Affectations":"Affiliations",exact:true}).click()
    if(kind!=="arbitres")await expect(page.getByText("Aucune affiliation enregistrée.",{exact:true})).toBeVisible()
    else await expect(page.getByRole("alert")).toBeVisible()
    requests.splice(0)
    await page.getByRole("tab",{name:kind==="athletes"?"Licence":"Licences",exact:true}).click()
    await expect(page.getByText("Aucune licence enregistrée.",{exact:true})).toBeVisible()
    expect(requests.filter(r=>r.includes("/api/licences/"))).toHaveLength(1)
   }
   await page.getByRole("button",{name:"Retour à la liste",exact:true}).click()
   const beforeCreate=requests.length
   await page.getByRole("button",{name:"Ajouter",exact:true}).click()
   expect(requests.length).toBe(beforeCreate)
   await expect(page.getByRole("button",{name:"Ouverture…",exact:true})).toHaveCount(0)
   await page.getByRole("dialog").getByLabel("Nom complet",{exact:false}).fill(`Création ${kind}`)
   await page.getByRole("combobox",{name:"Sexe",exact:false}).click();await page.getByRole("option",{name:"MASCULIN",exact:true}).click()
   await page.getByRole("button",{name:"Enregistrer",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0)
   await page.getByPlaceholder("Rechercher un acteur...").fill("Inconnu000");await expect(page.getByText("sur 0 résultat",{exact:true})).toBeVisible();await expect(page.getByText("Page 1 sur 1",{exact:true})).toBeVisible()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   checks.push({device,kind,list:true,pagination:true,search:true,detail:true,edit:true,create:true,empty:true,noOverflow:true})
  }
  for(const kind of kinds){
   await page.evaluate(kind=>window.qaActors(kind,false),kind)
   await expect(page.getByText("sur 32 résultats",{exact:true})).toBeVisible()
   await expect(page.getByRole("button",{name:"Ajouter",exact:true})).toHaveCount(0)
   await page.getByRole("button",{name:/^Voir /}).filter({visible:true}).first().click()
   await expect(page.getByRole("tab",{name:"Général",exact:true})).toBeVisible()
   await expect(page.getByRole("button",{name:"Modifier",exact:true})).toHaveCount(0)
   await expect(page.getByRole("button",{name:"Ajouter la photo",exact:true})).toHaveCount(0)
  }
  await page.screenshot({path:`${output}/actors-list-${device}.png`,fullPage:true})
  await page.close()
 }
 expect(errors).toEqual([])
}finally{await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify({checks,errors,offline:true},null,2))}
console.log(JSON.stringify({passed:checks.length,errors}))
