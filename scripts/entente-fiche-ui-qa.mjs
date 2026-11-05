import {build} from "esbuild"
import {chromium, expect} from "@playwright/test"
import {readFile, readdir, mkdir, writeFile} from "node:fs/promises"
import path from "node:path"
const output="test-results/entente-fiche-20261102"
await mkdir(output,{recursive:true})
const bundle=await build({entryPoints:["tests/ui/entry.tsx"],bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"offline-navigation",setup(b){b.onResolve({filter:/^next\/(?:navigation|link|image)$/},args=>({path:path.resolve(args.path==="next/image"?"tests/ui/image-shim.tsx":"tests/ui/navigation-shim.tsx")}))}}]})
async function css(dir){const parts=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())parts.push(await css(p));else if(e.name.endsWith(".css"))parts.push(await readFile(p,"utf8"))}return parts.join("\n")}
const styles=await css(".next/static"), browser=await chromium.launch({headless:true}), errors=[],checks=[]
try {
 for(const [device,width,height] of [["desktop",1440,1000],["mobile",390,844]]) {
  const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(15000)
  page.on("pageerror",error=>errors.push(error.message))
  await page.route("**/*",async route=>{
   const url=new URL(route.request().url())
   if(url.hostname!=="fecot-qa.test")return route.abort()
   if(url.pathname==="/")return route.fulfill({contentType:"text/html",body:"<html></html>"})
   const file=path.resolve("public",url.pathname.slice(1))
   if(!file.startsWith(path.resolve("public")+path.sep))return route.abort()
   try{return await route.fulfill({body:await readFile(file)})}catch{return route.abort()}
  })
  await page.goto("http://fecot-qa.test/")
  await page.setContent('<html lang="fr"><head><base href="http://fecot-qa.test/"></head><body><div id="root"></div></body></html>')
  await page.addStyleTag({content:styles});await page.addScriptTag({content:bundle.outputFiles[0].text})
  await page.getByRole("heading",{name:"Ligues",exact:true}).waitFor()
  await page.evaluate(()=>{
   const tables=window.qaTables
   tables.ENTENTES.rows=[{id_entente:"0101",id_ligue:"01",code_entente:"01",sigle_entente:"ETK",nom_entente:"Entente Alpha"},{id_entente:"0201",id_ligue:"02",code_entente:"01",nom_entente:"Autre entente"}]
   tables.CLUBS.rows=[{id_club:"C1",nom_club:"Club Alpha",sigle_club:"CA",id_entente:"0101",id_categorie_club:"FECOT-CAT-001",statut:"ACTIF"},{id_club:"C2",nom_club:"Club Beta",sigle_club:"CB",id_entente:"0101",statut:"INACTIVE"},{id_club:"OUT",nom_club:"Club hors entente",id_entente:"0201",statut:"ACTIF"}]
   window.qaRender("ententes")
  })
  await page.getByRole("button",{name:"Voir Entente Alpha",exact:true}).filter({visible:true}).click()
  await expect(page.getByRole("button",{name:"Ajouter un club",exact:true})).toHaveCount(0)
  await expect(page.getByRole("link",{name:"Voir la ligue parente",exact:true})).toHaveCount(0)
  await expect(page.getByRole("button",{name:"Modifier Entente Alpha",exact:true})).toHaveCount(1)
  const cards=page.locator('[data-slot="card"]')
  for(const [title,count] of [["Clubs","2"],["Clubs actifs","1"],["Clubs inactifs","1"]])await expect(cards.filter({has:page.getByText(title,{exact:true})}).getByText(count,{exact:true})).toHaveCount(1)
  if(device==="desktop") {
   const boxes=await Promise.all(["Clubs","Clubs actifs","Clubs inactifs"].map(title=>cards.filter({has:page.getByText(title,{exact:true})}).boundingBox()))
   expect(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))).toBeLessThan(2)
  }
  const clubCard=cards.filter({has:page.getByPlaceholder("Rechercher un club...")})
  await expect(clubCard).toContainText("Clubs de l’entente")
  await expect(clubCard.getByText("Club hors entente",{exact:true})).toHaveCount(0)
  if(device==="desktop") {
   expect((await clubCard.getByRole("columnheader").allTextContents()).slice(0,5)).toEqual(["ID Club","Club","Sigle","Catégorie","Statut"])
   await expect(clubCard.getByRole("link").first()).toHaveAttribute("href","/clubs?id=C1")
  }else await expect(clubCard.getByRole("link",{name:"Voir le club",exact:true}).first()).toHaveAttribute("href","/clubs?id=C1")
  await page.screenshot({path:`${output}/detail-${device}.png`,fullPage:true,animations:"disabled"})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.getByPlaceholder("Rechercher un club...").fill("CA")
  await expect(clubCard.getByText("Club Beta",{exact:true}).filter({visible:true})).toHaveCount(0)
  await page.evaluate(()=>window.qaRender("ententes",false))
  await expect(page.getByRole("button",{name:/^Modifier/})).toHaveCount(0)
  await page.getByRole("button",{name:"Retour à la liste",exact:true}).click()
  await expect(page.getByRole("heading",{name:"Ententes",exact:true})).toHaveCount(1)
  checks.push({device,noCreateClub:true,noParentShortcut:true,counts:true,clubLinks:true,viewer:true,noOverflow:true})
  await page.close()
 }
 expect(errors).toEqual([])
}finally{await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify({checks,errors,offline:true},null,2))}
console.log(JSON.stringify({passed:checks.length,errors}))
