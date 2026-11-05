import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { writeAudit } from "../../lib/audit/logger.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { AUDIT_LOG_HEADERS, AUDIT_LOG_SHEET, AUTH_ATTEMPT_HEADERS, AUTH_ATTEMPTS_SHEET, type SheetRow, type UsersSheetsAdapter } from "../../lib/users/types.ts"

class Memory implements UsersSheetsAdapter {
  rows: Record<string, SheetRow[]> = { [AUDIT_LOG_SHEET]: [], [AUTH_ATTEMPTS_SHEET]: [] }
  async readHeaders(sheet: string) { return sheet === AUDIT_LOG_SHEET ? [...AUDIT_LOG_HEADERS] : [...AUTH_ATTEMPT_HEADERS] }
  async readRows(sheet: string) { return this.rows[sheet].map((row) => ({ ...row })) }
  async appendRow(sheet: string, row: SheetRow) { await new Promise((resolve) => setTimeout(resolve, 5)); this.rows[sheet].push({ ...row }) }
}

test("deux écritures concurrentes du même request_id ne créent qu'une ligne", async () => { const adapter = new Memory(), input = { adapter, action: "TEST", typeObjet: "USER", result: "SUCCES" as const, requestId: "REQ-CONCURRENT" }; const results = await Promise.all([writeAudit(input), writeAudit(input)]); assert.deepEqual(results.sort(), ["CREATED", "EXISTING"]); assert.equal(adapter.rows[AUDIT_LOG_SHEET].length, 1) })
test("expurge les détails sensibles du journal", async () => { const adapter = new Memory(); await writeAudit({ adapter, action: "TEST", typeObjet: "USER", result: "ECHEC", requestId: "REQ-SAFE", details: { password: "interdit", cookie: "interdit", motif: "REFUS_GENERIQUE" } }); const serialized = JSON.stringify(adapter.rows); assert.ok(!serialized.includes("interdit")); assert.ok(serialized.includes("REFUS_GENERIQUE")) })
