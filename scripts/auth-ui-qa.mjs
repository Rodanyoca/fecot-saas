import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { chromium } from "@playwright/test"
import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"

const base = "http://127.0.0.1:3119"
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3119"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, AUTH_SECRET: randomBytes(32).toString("hex"), AUTH_TELEMETRY_HMAC_KEY: randomBytes(32).toString("hex"), FECOT_USERS_SPREADSHEET_ID: "", GOOGLE_SHEETS_USERS_SPREADSHEET_ID: "" } })
let started = false
const ready = new Promise((resolve, reject) => {
  server.stdout.on("data", data => { if (String(data).includes("Ready")) { started = true; resolve() } })
  server.stderr.on("data", () => undefined)
  server.on("error", reject)
  server.on("exit", code => { if (!started) reject(new Error(`Serveur QA arrêté (${code}).`)) })
})
let browser
try {
  await Promise.race([ready, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error("Démarrage QA trop long.")), 30000); timer.unref() })])
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })
  await page.goto(`${base}/login`)
  await page.getByRole("button", { name: "Se connecter", exact: true }).waitFor()
  assert.deepEqual(errors, [])
  await mkdir("test-results/territorial", { recursive: true })
  await page.screenshot({ path: "test-results/territorial/login-desktop.png", fullPage: true, animations: "disabled" })
  const client = page.request
  for (const path of ["/ligues", "/ententes", "/clubs"]) {
    const response = await client.get(base + path, { maxRedirects: 0 })
    assert.equal(response.status(), 307)
    assert.match(response.headers().location, /\/login$/)
  }
  for (const path of ["/api/ligues", "/api/ententes", "/api/clubs", "/api/clubs/id.avec.points/logo"]) assert.equal((await client.post(base + path, { headers: { Origin: base }, data: {} })).status(), 401)
  assert.equal((await client.post(`${base}/api/auth/login`, { headers: { Origin: "https://foreign.example" }, data: { email: "test@example.test", password: "isolated" } })).status(), 403)
  assert.equal((await client.post(`${base}/api/auth/login`, { headers: { Origin: base }, data: { email: "test@example.test", password: "isolated" } })).status(), 503)
  console.log("QA serveur : login sans erreur navigateur, redirections anonymes, refus des écritures et origines étrangères, indisponibilité explicite sans configuration validés.")
} finally {
  await browser?.close()
  if (process.platform === "win32") await new Promise(resolve => { const kill = spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); kill.on("exit", resolve); kill.on("error", resolve) })
  else server.kill("SIGTERM")
}
