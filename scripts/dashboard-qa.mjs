import {build} from "esbuild"
import {chromium,expect} from "@playwright/test"
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"
import {readFile,mkdir,writeFile} from "node:fs/promises"
import path from "node:path"
const output="test-results/dashboard"
await mkdir(output,{recursive:true})
const bundle=await build({entryPoints:["tests/ui/dashboard-entry.tsx"],bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"offline-links",setup(b){b.onResolve({filter:/^next\/(?:navigation|link)$/},()=>({path:path.resolve("tests/ui/navigation-shim.tsx")}))}}]})
const css=(await postcss([tailwind({base:process.cwd()})]).process(await readFile("app/globals.css","utf8"),{from:path.resolve("app/globals.css")})).css
const browser=await chromium.launch({headless:true}),checks=[],errors=[]
try {
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}})
  page.on("pageerror",error=>errors.push(error.message))
  await page.route("**/*",route=>route.abort())
  await page.setContent('<html lang="fr"><body><div id="root"></div></body></html>')
  await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text})
  for(const mode of ["normal","empty","failure"]){
   await page.evaluate(mode=>window.qaDashboard(mode),mode)
   await expect(page.getByRole("heading",{name:"Synthèse générale"})).toBeVisible()
   await expect(page.locator("header").getByRole("button",{name:"Se déconnecter"})).toBeVisible()
   await expect(page.locator("header").getByRole("button",{name:"Actualiser"})).toHaveCount(0)
   await expect(page.getByRole("link",{name:"Mon compte"})).toHaveCount(0)
   await expect(page.locator("main").getByRole("button",{name:"Actualiser",exact:true})).toBeVisible()
   const date=page.locator("time"),before=await date.getAttribute("datetime")
   const calls=await page.evaluate(()=>window.qaRefreshCount())
   await page.getByRole("button",{name:"Actualiser",exact:true}).click()
   await expect.poll(()=>page.evaluate(()=>window.qaRefreshCount())).toBe(calls+1)
   await expect(date).not.toHaveAttribute("datetime",before)
   const [dateBox,buttonBox,headerBox]=await Promise.all([date.boundingBox(),page.getByRole("button",{name:"Actualiser",exact:true}).boundingBox(),page.locator("header").boundingBox()])
   expect(dateBox.y).toBeGreaterThanOrEqual(headerBox.y+headerBox.height)
   if(width===1440)expect(buttonBox.x).toBeGreaterThan(dateBox.x)
   await expect(page.getByRole("table")).toHaveCount(2)
   await expect(page.getByRole("link")).toHaveCount(9)
   await expect(page.getByRole("link",{name:"Ligues",exact:true})).toBeVisible()
   const expected=mode==="normal"?"3":mode==="empty"?"0":"Indisponible"
   await expect(page.getByRole("row").filter({has:page.getByRole("link",{name:"Ligues",exact:true})}).getByRole("cell").nth(1)).toHaveText(expected)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   await page.screenshot({path:`${output}/${width}-${mode}.png`,fullPage:true})
   checks.push({width,mode,noPageOverflow:true,connectedLinks:9})
  }
  await page.close()
 }
 expect(errors).toEqual([])
} finally {await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify({checks,errors,noGoogle:true},null,2))}
console.log(JSON.stringify({passed:checks.length,errors}))
