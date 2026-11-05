import { build } from "esbuild"
import { chromium } from "@playwright/test"
import path from "node:path"
import assert from "node:assert/strict"
const result = await build({ entryPoints: ["tests/ui/navigation-continuity.tsx"], bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", plugins: [{ name: "next-shims", setup(b) { b.onResolve({ filter: /^next\/(?:navigation|link|image)$/ }, a => ({ path: path.resolve(a.path === "next/image" ? "tests/ui/image-shim.tsx" : "tests/ui/navigation-shim.tsx") })) } }] })
const browser = await chromium.launch({ headless: true })
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
 await page.route("http://nav.test/**", r => r.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }))
 await page.goto("http://nav.test/")
 await page.addScriptTag({ content: result.outputFiles[0].text })
 await page.getByText("Page 0", { exact: true }).waitFor()
 assert.equal(await page.getByRole("link", { name: "Ligues", exact: true }).count(), 1, "Navigation absente avant la reponse session")
 await page.getByRole("button", { name: "Acteurs", exact: true }).click()
 await page.evaluate(() => { window.navigationNode = document.querySelector("aside") })
 await page.evaluate(() => window.navResolve())
 await page.evaluate(() => window.navRender(1))
 await page.getByText("Page 1", { exact: true }).waitFor()
 assert.equal(await page.getByRole("link", { name: "Ligues", exact: true }).count(), 1, "Navigation disparue au changement de page")
 assert.equal(await page.evaluate(() => document.querySelector("aside") === window.navigationNode), true, "Le menu a ete remonte")
 assert.equal(await page.getByRole("button", { name: "Acteurs", exact: true }).getAttribute("aria-expanded"), "false")
 console.log("Navigation visible des le premier rendu et pendant un changement de page avec session retardee.")
} finally { await browser.close() }
