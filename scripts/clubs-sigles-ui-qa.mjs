import {build} from "esbuild"
import {chromium, expect} from "@playwright/test"
import {readFile, readdir, mkdir, writeFile} from "node:fs/promises"
import path from "node:path"
const output="test-results/clubs-sigles-20261102"
await mkdir(output,{recursive:true})
const bundle=await build({entryPoints:["tests/ui/entry.tsx"],bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"offline-navigation",setup(b){b.onResolve({filter:/^next\/(?:navigation|link|image)$/},args=>({path:path.resolve(args.path==="next/image"?"tests/ui/image-shim.tsx":"tests/ui/navigation-shim.tsx")}))}}]})
async function css(dir){const parts=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())parts.push(await css(p));else if(e.name.endsWith(".css"))parts.push(await readFile(p,"utf8"))}return parts.join("\n")}
const styles=await css(".next/static"), browser=await chromium.launch({headless:true}), errors=[],checks=[]
try {
 for(const [device,width,height] of [["desktop",1440,1000],["mobile",390,844]]) {
  const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(15000)
  page.on("pageerror",error=>errors.push(error.message))
  await page.route("**/*",route=>new URL(route.request().url()).hostname==="fecot-qa.test"?route.fulfill({contentType:"text/html",body:"<html></html>"}):route.abort())
  await page.goto("http://fecot-qa.test/")
  await page.setContent('<html lang="fr"><head><base href="http://fecot-qa.test/"></head><body><div id="root"></div></body></html>')
  await page.addStyleTag({content:styles});await page.addScriptTag({content:bundle.outputFiles[0].text})
  await page.getByRole("heading",{name:"Ligues",exact:true}).waitFor()
  await page.evaluate(()=>{
   const tables=window.qaTables
   tables.LIGUES.rows[0].sigle_ligue="LTK";tables.LIGUES.rows[1].sigle_ligue="LK"
   tables.ENTENTES.rows=[{id_entente:"0101",id_ligue:"01",code_entente:"01",sigle_entente:"ETK",nom_entente:"Entente complète Alpha"},{id_entente:"0201",id_ligue:"02",code_entente:"01",sigle_entente:"ETK",nom_entente:"Entente complète Beta"}]
   tables.CLUBS.rows=[{id_club:"C1",nom_club:"Club Alpha",id_entente:"0101",id_categorie_club:"FECOT-CAT-001",id_sexe:"FECOT-SEX-001",statut:"ACTIF"},{id_club:"C2",nom_club:"Club Beta",id_entente:"0201",id_categorie_club:"FECOT-CAT-001",statut:"ACTIF"},{id_club:"C3",nom_club:"Club sans parent",id_entente:"missing",id_ligue_historique:"01",statut:"ACTIF"}]
   window.qaRender("clubs")
  })
  await page.getByRole("heading",{name:"Clubs",exact:true}).waitFor()
  if(device==="desktop") {
   const heads=await page.getByRole("columnheader").allTextContents()
   expect(heads.slice(0,7)).toEqual(["ID","LOGO","CLUB","CATÉGORIE","ENTENTE","LIGUE","STATUT"])
   await expect(page.locator("tbody tr").first()).toContainText("ETK")
   await expect(page.locator("tbody tr").first()).toContainText("LTK")
   await page.getByRole("combobox",{name:"Ligue",exact:true}).click();await page.getByRole("option",{name:"LTK",exact:true}).click()
   await expect(page.locator("tbody tr")).toHaveCount(1)
   await page.getByRole("combobox",{name:"Ligue",exact:true}).click();await page.getByRole("option",{name:"Tous",exact:true}).click()
   await page.getByRole("combobox",{name:"Entente",exact:true}).click();await page.getByRole("option",{name:"ETK (0101)",exact:true}).click()
   await expect(page.locator("tbody tr")).toHaveCount(1)
   await page.getByRole("combobox",{name:"Entente",exact:true}).click();await page.getByRole("option",{name:"Tous",exact:true}).click()
  }
  await page.getByPlaceholder("Rechercher un club...").fill("Entente complète Alpha")
  await expect(page.getByRole("button",{name:"Voir Club Alpha",exact:true}).filter({visible:true})).toHaveCount(1)
  await page.screenshot({path:`${output}/list-${device}.png`,fullPage:true,animations:"disabled"})
  await page.getByRole("button",{name:"Voir Club Alpha",exact:true}).filter({visible:true}).click()
  const affiliation=page.locator('[data-slot="card"]').filter({has:page.getByText("Affiliation",{exact:true})})
  await expect(affiliation).toContainText("ETK");await expect(affiliation).toContainText("LTK")
  const text=await affiliation.innerText();expect(text.indexOf("Catégorie")).toBeLessThan(text.indexOf("Entente"));expect(text.indexOf("Entente")).toBeLessThan(text.indexOf("Ligue"))
  await expect(page.getByRole("link",{name:"Voir l’entente parente",exact:true})).toHaveCount(0)
  await expect(page.getByRole("link",{name:"Voir la ligue",exact:true})).toHaveCount(0)
  await expect(page.getByRole("button",{name:"Modifier",exact:true})).toHaveCount(1)
  await page.screenshot({path:`${output}/detail-${device}.png`,fullPage:true,animations:"disabled"})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.evaluate(()=>window.qaRender("clubs",false))
  await expect(page.getByRole("button",{name:"Modifier",exact:true})).toHaveCount(0)
  await page.getByRole("button",{name:"Retour à la liste",exact:true}).click()
  await page.getByPlaceholder("Rechercher un club...").fill("Club sans parent")
  if(device==="desktop")await expect(page.locator("tbody tr").first()).toContainText("Non renseigné")
  await expect(page.getByRole("button",{name:"Ajouter un club",exact:true})).toHaveCount(0)
  checks.push({device,order:true,sigles:true,fullNameSearch:true,noParentShortcuts:true,viewer:true,noOverflow:true})
  await page.close()
 }
 expect(errors).toEqual([])
}finally{await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify({checks,errors,offline:true},null,2))}
console.log(JSON.stringify({passed:checks.length,errors}))
