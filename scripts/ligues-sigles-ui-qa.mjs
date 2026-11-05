import {build} from "esbuild"
import {chromium, expect} from "@playwright/test"
import {readFile, readdir, mkdir, writeFile} from "node:fs/promises"
import path from "node:path"
const output="test-results/ligues-sigles-20261102"
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
   tables.LIGUES.rows[0].sigle_ligue="LTK"
   tables.ENTENTES.rows=[{id_entente:"0101",id_ligue:"01",code_entente:"01",sigle_entente:"ETK",nom_entente:"Entente test"}]
   tables.CLUBS.rows=[{id_club:"C1",nom_club:"Club test",id_entente:"0101",id_categorie_club:"FECOT-CAT-001",statut:"ACTIF"}]
   window.qaRender("ligues")
  })
  await page.getByPlaceholder("Rechercher une ligue...").fill("LTK")
  if(device==="desktop") {
   expect((await page.getByRole("columnheader").allTextContents()).slice(0,5)).toEqual(["ID","LIGUE","SIGLE","PROVINCE","STATUT"])
   await expect(page.locator("tbody tr")).toHaveCount(1)
   await expect(page.locator("tbody tr")).toContainText("LTK")
  }else await expect(page.getByText("Sigle : LTK",{exact:true})).toBeVisible()
  await page.screenshot({path:`${output}/list-${device}.png`,fullPage:true,animations:"disabled"})
  await page.getByRole("button",{name:"Voir LIGUE DE TAEKWONDO  DE KINSHASA",exact:true}).filter({visible:true}).click()
  const cards=page.locator('[data-slot="card"]')
  const general=cards.filter({has:page.getByText("Informations générales",{exact:true})})
  await expect(general).toContainText("Sigle");await expect(general).toContainText("LTK")
  for(const [title,content] of [["Ententes liées","Entente test"],["Clubs liés","Club test"]]) {
   const card=cards.filter({has:page.getByPlaceholder(title==="Ententes liées"?"Rechercher une entente...":"Rechercher un club...")})
   await expect(card).toContainText(content)
   await expect(card.getByRole("columnheader",{name:"Actions",exact:true})).toHaveCount(0)
   await expect(card.getByRole("link")).toHaveCount(0)
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:`${output}/detail-${device}.png`,fullPage:true,animations:"disabled"})
  await page.evaluate(()=>window.qaRender("ligues",false))
  await expect(page.getByRole("button",{name:/^Modifier/})).toHaveCount(0)
  checks.push({device,sigle:true,search:true,relatedDataVisible:true,noRelatedConsultActions:true,viewer:true,noOverflow:true})
  await page.close()
 }
 expect(errors).toEqual([])
}finally{await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify({checks,errors,offline:true},null,2))}
console.log(JSON.stringify({passed:checks.length,errors}))
