// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { AUTH_ATTEMPTS_SHEET, type AuthAttempt, type AuditLogEntry, type UsersSheetsAdapter } from "../users/types.ts"

export const AUTH_ATTEMPT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000
export const AUDIT_MINIMUM_RETENTION_MS = 730 * 24 * 60 * 60 * 1000

export function expiredAttemptIds(attempts: AuthAttempt[], now: Date) { return attempts.filter((item) => now.getTime() - Date.parse(item.dateTentative) > AUTH_ATTEMPT_RETENTION_MS).map((item) => item.idTentative) }
export function assertAuditRetention(entries: AuditLogEntry[], now: Date) { return entries.filter((item) => now.getTime() - Date.parse(item.dateOperation) <= AUDIT_MINIMUM_RETENTION_MS) }

export async function purgeExpiredAttempts(input: { adapter: UsersSheetsAdapter; attempts: AuthAttempt[]; now?: Date; execute?: boolean }) {
  const ids = expiredAttemptIds(input.attempts, input.now ?? new Date())
  if (!input.execute) return { ids, deleted: 0 }
  if (!input.adapter.deleteRow) throw new Error("La suppression contrôlée des lignes n'est pas disponible.")
  for (const id of ids) await input.adapter.deleteRow(AUTH_ATTEMPTS_SHEET, "id_tentative", id)
  return { ids, deleted: ids.length }
}
