import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { attemptState, progressiveDelay } from "../../lib/auth/attempts.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { expiredAttemptIds, assertAuditRetention } from "../../lib/auth/retention.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { pseudonymizeTelemetry } from "../../lib/auth/telemetry-hash.ts"
import type { AuthAttempt, AuditLogEntry } from "../../lib/users/types.ts"

const now = new Date("2026-08-31T12:00:00.000Z")
const attempt = (minutesAgo: number, result: AuthAttempt["resultat"] = "ECHEC", id = String(minutesAgo)): AuthAttempt => ({ idTentative: `ATT-${id}`, identifiantHash: "email-hmac", ipHash: "ip-hmac", dateTentative: new Date(now.getTime() - minutesAgo * 60_000).toISOString(), resultat: result, requestId: `REQ-${id}` })

test("active l'attente progressive au cinquième échec", () => { assert.equal(progressiveDelay(4), 0); assert.equal(progressiveDelay(5), 250); assert.equal(progressiveDelay(9), 2_000) })
test("bloque exactement trente minutes au dixième échec puis se lève automatiquement", () => { const failures = Array.from({ length: 10 }, (_, index) => attempt(9 - index, "ECHEC", String(index))); const state = attemptState(failures, "email-hmac", "ip-hmac", now); assert.equal(state.blocked, true); assert.equal(state.blockedUntil?.toISOString(), "2026-08-31T12:30:00.000Z"); assert.equal(attemptState(failures, "email-hmac", "ip-hmac", new Date("2026-08-31T12:30:00.000Z")).blocked, false) })
test("un succès intermédiaire clôt la série", () => { const rows = [attempt(3), attempt(2, "SUCCES"), attempt(1)]; assert.equal(attemptState(rows, "email-hmac", "ip-hmac", now).failures, 1) })
test("un changement d'adresse réseau ne contourne pas la protection du compte", () => { const rows = Array.from({ length: 5 }, (_, index) => ({ ...attempt(index), ipHash: `ip-${index}` })); assert.equal(attemptState(rows, "email-hmac", "nouvelle-ip", now).failures, 5) })
test("pseudonymise de manière stable sans conserver la valeur source", () => { const key = "cle-de-telemetrie-synthetique-32-caracteres"; const hash = pseudonymizeTelemetry("Admin@Example.org", key); assert.equal(hash, pseudonymizeTelemetry("admin@example.org", key)); assert.equal(hash.length, 64); assert.ok(!hash.includes("admin")) })
test("purge les tentatives après 90 jours et préserve l'audit récent", () => { assert.deepEqual(expiredAttemptIds([attempt(90 * 24 * 60 + 1, "ECHEC", "old"), attempt(1)], now), ["ATT-old"]); const audit = [{ idOperation: "AUD-1", idUser: null, action: "TEST", typeObjet: "TEST", idObjet: null, dateOperation: now.toISOString(), resultat: "SUCCES", requestId: "REQ-A", detailsNonSensibles: "{}" }] as AuditLogEntry[]; assert.equal(assertAuditRetention(audit, now).length, 1) })
