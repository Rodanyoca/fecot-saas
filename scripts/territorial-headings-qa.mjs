// FECOT components in isolation. No production API calls or business writes.
import {build} from "esbuild"
import {chromium,expect} from "@playwright/test"
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"
import {readFile,mkdir,writeFile} from "node:fs/promises"
import path from "node:path"
const output="test-results/territorial-headings-20261103"
await mkdir(output,{recursive:true})
const bundle=await build({entryPoints:["tests/ui/entry.tsx"],bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"offline-navigation",setup(builder){builder.onResolve({filter:/^next\/(?:navigation|link|image)$/},args=>({path:path.resolve(args.path==="next/image"?"tests/ui/image-shim.tsx":"tests/ui/navigation-shim.tsx")}))}}]})
const css=(await postcss([tailwind({base:process.cwd()})]).process(await readFile("app/globals.css","utf8"),{from:path.resolve("app/globals.css")})).css
const browser=await chromium.launch({headless:true}),checks=[],errors=[]
try{
 for(const [device,width,height]of [["desktop",1440,1000],["mobile",390,844]]){
  const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(10000);page.on("pageerror",e=>errors.push(e.message))
  await page.route("**/*",async route=>{
   const url=new URL(route.request().url());if(url.hostname!=="fecot-qa.test")return route.abort()
   if(url.pathname==="/")return route.fulfill({contentType:"text/html",body:'<html lang="fr"><body><div id="root"></div></body></html>'})
   const file=path.resolve("public",url.pathname.slice(1));if(!file.startsWith(path.resolve("public")+path.sep))return route.abort()
   try{return route.fulfill({body:await readFile(file)})}catch{return route.abort()}
  })
  await page.goto("http://fecot-qa.test/");await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text})
  await page.getByRole("heading",{name:"Ligues",exact:true}).waitFor()
  await page.evaluate(()=>{window.qaTables.ENTENTES.rows=[{id_entente:"0101",id_ligue:"01",code_entente:"01",nom_entente:"Entente de recette",sigle_entente:"ETK",statut:"ACTIF"}];window.qaTables.CLUBS.rows=[{id_club:"C-QA",nom_club:"Club de recette",sigle_club:"CTK",id_entente:"0101",statut:"ACTIF"}]})
  for(const [kind,title,expected]of [["ligues","Ligues",["ID","LIGUE","SIGLE","PROVINCE","STATUT","Actions"]],["ententes","Ententes",["ID","ENTENTE","PSEUDO","LIGUE","STATUT","Actions"]],["clubs","Clubs",["ID","LOGO","CLUB","CATÉGORIE","ENTENTE","LIGUE","STATUT","Actions"]]]){
   await page.evaluate(kind=>window.qaRender(kind),kind);await page.getByRole("heading",{name:title,exact:true}).waitFor()
   const headers=page.locator("thead th");expect(await headers.allTextContents()).toEqual(expected)
   const transforms=await headers.evaluateAll(headers=>headers.map(header=>getComputedStyle(header.querySelector("button")||header).textTransform));expect(transforms.every(value=>value==="uppercase")).toBe(true)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   await page.screenshot({path:`${output}/${kind}-${device}.png`,fullPage:true})
   if(kind==="clubs"){
    await page.getByRole("button",{name:"Voir Club de recette",exact:true}).filter({visible:true}).click()
    await expect(page.getByText(/Personnes liées au club par une affiliation active/)).toHaveCount(0)
    await expect(page.getByText("Athlètes du club",{exact:true})).toBeVisible()
    await page.screenshot({path:`${output}/club-detail-${device}.png`,fullPage:true})
   }
   checks.push({kind,device,uppercase:true,correctFecotComponents:true,noOverflow:true})
  }
  await page.close()
 }
 expect(errors).toEqual([])
}finally{await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify({checks,errors,offline:true},null,2))}
console.log(JSON.stringify({passed:checks.length,errors}))
