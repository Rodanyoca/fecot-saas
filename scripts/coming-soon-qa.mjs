import {build} from "esbuild"
import {chromium,expect} from "@playwright/test"
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"
import {readFile,mkdir,writeFile} from "node:fs/promises"
import path from "node:path"
const output="test-results/coming-soon"
await mkdir(output,{recursive:true})
const bundle=await build({entryPoints:["tests/ui/coming-soon-entry.tsx"],bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"offline-navigation",setup(b){b.onResolve({filter:/^next\/(?:navigation|link|image)$/},a=>({path:path.resolve(a.path==="next/image"?"tests/ui/image-shim.tsx":"tests/ui/navigation-shim.tsx")}))}}]})
const css=(await postcss([tailwind({base:process.cwd()})]).process(await readFile("app/globals.css","utf8"),{from:path.resolve("app/globals.css")})).css
const browser=await chromium.launch({headless:true}),errors=[],checks=[]
try{
 for(const [device,width,height] of [["desktop",1440,1000],["mobile",390,844]]){
  const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(10000);page.on("pageerror",e=>errors.push(e.message))
  await page.route("**/*",async route=>{
   const url=new URL(route.request().url());if(url.hostname!=="fecot-qa.test")return route.abort()
   if(url.pathname==="/")return route.fulfill({contentType:"text/html",body:'<html lang="fr"><body><div id="root"></div></body></html>'})
   const file=path.resolve("public",url.pathname.slice(1));if(!file.startsWith(path.resolve("public")+path.sep))return route.abort()
   try{return route.fulfill({body:await readFile(file)})}catch{return route.abort()}
  })
  let navigations=0
  page.on("framenavigated",frame=>{if(frame===page.mainFrame())navigations++})
  await page.goto("http://fecot-qa.test/");await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text})
  for(const [key,title]of [["teams","Équipes nationales"],["activities","Activités"],["documents","Documents"],["settings","Paramètres"]]){
   await page.evaluate(key=>window.qaComingSoon(key),key)
   await expect(page.getByRole("heading",{name:title,exact:true})).toBeVisible()
   await expect(page.getByRole("link",{name:"Mon compte",exact:true})).toHaveCount(0)
   await expect(page.locator("header").getByRole("button",{name:/Actualiser/})).toHaveCount(0)
   await expect(page.getByRole("button",{name:"Se déconnecter",exact:true})).toBeVisible()
   await expect(page.getByRole("heading",{name:key==="settings"?"Module en préparation":"Bientôt disponible",exact:true})).toBeVisible()
   if(device==="mobile")await page.getByRole("button",{name:"Ouvrir la navigation principale",exact:true}).click()
   await expect(page.getByRole("navigation",{name:"Navigation principale"}).getByRole("link",{name:"Ligues",exact:true})).toBeVisible()
   if(device==="mobile"){await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).toHaveCount(0)}
   await expect(page.getByRole("heading",{name:key==="settings"?"Module en préparation":"Bientôt disponible",exact:true})).toBeVisible()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   await page.screenshot({path:`${output}/${key}-${device}.png`,fullPage:true})
   checks.push({key,device,placeholder:true,navigationPreserved:true,noOverflow:true})
  }
  expect(navigations).toBe(1)
  checks.push({device,noAutomaticReload:true,accountLinkRemoved:true,headerLogoutOnly:true})
  await page.close()
 }
 expect(errors).toEqual([])
}finally{await browser.close();await writeFile(`${output}/browser.json`,JSON.stringify({checks,errors,noGoogle:true},null,2))}
console.log(JSON.stringify({passed:checks.length,errors}))
