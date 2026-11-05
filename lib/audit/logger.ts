import { randomUUID } from "node:crypto"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { UsersRepository } from "../users/repository.ts"
import type { AuditResult, UsersSheetsAdapter } from "../users/types.ts"

const FORBIDDEN = /password|mot[_ -]?de[_ -]?passe|secret|cookie|authorization|password_hash|temporaryaccess/i

export function sanitizeAuditDetails(details: Record<string, unknown> = {}) {
  return Object.fromEntries(Object.entries(details).filter(([key, value]) => !FORBIDDEN.test(key) && !FORBIDDEN.test(String(value))).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 200) : value]))
}

export async function writeAudit(input: { adapter: UsersSheetsAdapter; actorId?: string | null; action: string; typeObjet: string; objectId?: string | null; result: AuditResult; requestId: string; details?: Record<string, unknown>; now?: Date }) {
  return new UsersRepository(input.adapter).appendAuditLog({ idOperation: `AUD-${randomUUID()}`, idUser: input.actorId ?? null, action: input.action, typeObjet: input.typeObjet, idObjet: input.objectId ?? null, dateOperation: (input.now ?? new Date()).toISOString(), resultat: input.result, requestId: input.requestId, detailsNonSensibles: JSON.stringify(sanitizeAuditDetails(input.details)) })
}
