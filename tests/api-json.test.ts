import test from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { readApiJson, apiErrorMessage } from "../lib/api/client.ts"
test("HTML 404 never exposes a JSON parser error or server HTML", async () => {
 const response = new Response('<!DOCTYPE html><html>Not found</html>', { status: 404, headers: { "Content-Type": "text/html" } })
 await assert.rejects(() => readApiJson(response), error => error instanceof Error && error.message.includes("Réponse du service indisponible") && error.message.includes("404") && !error.message.includes("Unexpected token") && !error.message.includes("<!DOCTYPE"))
})
test("JSON responses preserve business errors and uncertain-write fields", async () => {
 const body = { error: { code: "WRITE_UNCERTAIN", uncertain: true, fields: { date_debut: "Période en conflit" } } }
 assert.deepEqual(await readApiJson(Response.json(body, { status: 503 })), body)
 assert.deepEqual(await readApiJson(Response.json({ affiliations: [] })), { affiliations: [] })
})
test("malformed JSON and empty non-JSON responses produce a controlled error", async () => {
 await assert.rejects(() => readApiJson(new Response("{bad", { headers: { "Content-Type": "application/json" } })), /Réponse du service indisponible/)
 await assert.rejects(() => readApiJson(new Response(null, { status: 204 })), /HTTP 204/)
})
test("proxy string errors and handler object errors retain their reason and HTTP status", () => {
 assert.equal(apiErrorMessage({ status: 503 }, { error: "Service d’authentification indisponible." }, "Lecture impossible."), "Service d’authentification indisponible. (HTTP 503)")
 assert.equal(apiErrorMessage({ status: 401 }, { error: "Session invalide." }, "Lecture impossible."), "Session invalide. (HTTP 401)")
 assert.equal(apiErrorMessage({ status: 422 }, { error: { message: "Club inconnu." } }, "Lecture impossible."), "Club inconnu. (HTTP 422)")
 assert.equal(apiErrorMessage({ status: 503 }, null, "Lecture impossible."), "Lecture impossible. (HTTP 503)")
})
