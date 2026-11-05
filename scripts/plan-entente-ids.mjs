// Local files only; deliberately no execute mode or Google dependency.
import fs from "node:fs/promises"
import path from "node:path"
import { planEntenteIds } from "../lib/entente-id-migration.ts"

const [input, output, ...extra] = process.argv.slice(2)
if (!input || !output || extra.length || path.resolve(input) === path.resolve(output)) throw new Error("Usage : node scripts/plan-entente-ids.mjs entree.json plan.json (fichiers distincts)")
const snapshot = JSON.parse(await fs.readFile(input, "utf8"))
if (!snapshot?.tables || ["LIGUES", "ENTENTES", "CLUBS"].some(name => !Array.isArray(snapshot.tables[name]))) throw new Error("Snapshot invalide : LIGUES, ENTENTES et CLUBS sont requis.")
const result = planEntenteIds(snapshot)
await fs.writeFile(output, JSON.stringify(result, null, 2), { flag: "wx" })
console.log(JSON.stringify({ ententes: result.mapping.length, cells: result.cells.length, issues: result.issues.length, reviewable: result.reviewable, executable: false }))
if (!result.reviewable) process.exitCode = 2
