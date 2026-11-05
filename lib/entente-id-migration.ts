// @ts-expect-error Node's test runner requires explicit TypeScript extensions.
import { ententeIdentity } from "./entente-id.ts"

export type MigrationSource = { workbook: string; sheet: string; values: unknown[][] }
export type EntenteMigrationSnapshot = {
  tables: { LIGUES: unknown[][]; ENTENTES: unknown[][]; CLUBS: unknown[][] }
  dependencies?: MigrationSource[]
  inventoryComplete?: boolean
  changes?: { oldId: string; idLigue: string; codeEntente: string }[]
}

/** Offline review plan only. No credentials, network client or write executor. */
export function planEntenteIds(snapshot: EntenteMigrationSnapshot) {
  const issues: { kind: string; location: string }[] = []
  const mapping: { oldId: string; newId: string; ligueId: string; localCode: string; row: number }[] = []
  const cells: { workbook: string; sheet: string; row: number; column: string; before: string; after: string }[] = []
  const sources: MigrationSource[] = [
    ...Object.entries(snapshot.tables).map(([sheet, values]) => ({ workbook: "territory", sheet, values })),
    ...(snapshot.dependencies || []),
  ]
  if (!snapshot.inventoryComplete) issues.push({ kind: "INVENTORY_NOT_CONFIRMED", location: "workbooks" })
  const table = (source: MigrationSource, required: string[] = []) => {
    if (!Array.isArray(source.values) || !source.values.every(Array.isArray)) throw new Error("Snapshot invalide : tableaux attendus.")
    const headers = (source.values[0] || []).map(v => typeof v === "string" ? v.trim() : "")
    const named = headers.filter(Boolean)
    if (new Set(named).size !== named.length || required.some(h => !headers.includes(h))) {
      issues.push({ kind: "INVALID_HEADERS", location: `${source.workbook}/${source.sheet}` })
    }
    return headers
  }
  const leagues = sources.find(s => s.workbook === "territory" && s.sheet === "LIGUES")!
  const ententes = sources.find(s => s.workbook === "territory" && s.sheet === "ENTENTES")!
  const clubs = sources.find(s => s.workbook === "territory" && s.sheet === "CLUBS")!
  const leagueHeaders = table(leagues, ["id_ligue"])
  const leagueIds = new Set<string>()
  for (const [index, row] of leagues.values.slice(1).entries()) {
    if (!row.some(v => v !== "" && v != null)) continue
    const id = row[leagueHeaders.indexOf("id_ligue")]
    if (typeof id !== "string" || !id.trim() || leagueIds.has(id.trim())) issues.push({ kind: "INVALID_OR_DUPLICATE_LEAGUE", location: `LIGUES:${index + 2}` })
    else leagueIds.add(id.trim())
  }
  const headers = table(ententes, ["id_entente", "id_ligue", "code_entente"])
  table(clubs, ["id_entente"])
  const oldIds = new Set<string>(), newIds = new Set<string>()
  const changes = new Map<string, { oldId: string; idLigue: string; codeEntente: string }>()
  for (const change of snapshot.changes || []) {
    if (changes.has(change.oldId)) issues.push({ kind: "AMBIGUOUS_CHANGE", location: "changes" })
    changes.set(change.oldId, change)
  }
  for (const [index, row] of ententes.values.slice(1).entries()) {
    if (!row.some(v => v !== "" && v != null)) continue
    const location = `ENTENTES:${index + 2}`, old = row[headers.indexOf("id_entente")]
    if (typeof old !== "string" || !old.trim()) { issues.push({ kind: "INVALID_OLD_ID", location }); continue }
    const oldId = old.trim()
    if (oldIds.has(oldId)) issues.push({ kind: "DUPLICATE_OLD_ID", location })
    oldIds.add(oldId)
    try {
      const change = changes.get(oldId)
      const identity = ententeIdentity(change ? change.idLigue : row[headers.indexOf("id_ligue")], change ? change.codeEntente : row[headers.indexOf("code_entente")])
      if (!leagueIds.has(identity.idLigue)) issues.push({ kind: "UNKNOWN_LEAGUE", location })
      if (newIds.has(identity.idEntente)) issues.push({ kind: "TARGET_COLLISION", location })
      newIds.add(identity.idEntente)
      mapping.push({ oldId, newId: identity.idEntente, ligueId: identity.idLigue, localCode: identity.codeEntente, row: index + 2 })
      const oldLeague = row[headers.indexOf("id_ligue")]
      if (oldLeague !== identity.idLigue) {
        issues.push({ kind: "REPARENT_REQUIRES_GEOGRAPHY_AND_SCOPE_REVIEW", location })
        if (typeof oldLeague === "string") cells.push({ workbook: "territory", sheet: "ENTENTES", row: index + 2, column: "id_ligue", before: oldLeague, after: identity.idLigue })
      }
      if (oldId !== identity.idEntente) cells.push({ workbook: "territory", sheet: "ENTENTES", row: index + 2, column: "id_entente", before: oldId, after: identity.idEntente })
      const rawCode = row[headers.indexOf("code_entente")] as string
      if (rawCode !== identity.codeEntente) cells.push({ workbook: "territory", sheet: "ENTENTES", row: index + 2, column: "code_entente", before: rawCode, after: identity.codeEntente })
    } catch { issues.push({ kind: "INVALID_ID_OR_LOCAL_CODE", location }) }
  }
  for (const oldId of changes.keys()) if (!oldIds.has(oldId)) issues.push({ kind: "UNKNOWN_CHANGE_TARGET", location: "changes" })
  for (const item of mapping) if (item.oldId !== item.newId && oldIds.has(item.newId)) issues.push({ kind: "TARGET_ALREADY_OCCUPIED", location: `ENTENTES:${item.row}` })
  const byOldId = new Map(mapping.map(m => [m.oldId, m]))
  const sourceNames = new Set<string>()
  for (const source of sources) {
    const key = `${source.workbook}/${source.sheet}`
    if (sourceNames.has(key)) issues.push({ kind: "DUPLICATE_SOURCE", location: key })
    sourceNames.add(key)
    const names = table(source)
    for (const [index, row] of source.values.slice(1).entries()) for (const [column, value] of row.entries()) {
      if (source === ententes && names[column] === "id_entente") continue
      if (value === "" || value == null) continue
      const location = `${key}:${index + 2}:${names[column] || column + 1}`
      if (names[column] === "id_entente" && typeof value !== "string") issues.push({ kind: "NUMERIC_REFERENCE_LOST_ZEROS", location })
      const ref = typeof value === "string" ? byOldId.get(value.trim()) : undefined
      if (names[column] === "id_entente" && !ref) issues.push({ kind: "DANGLING_REFERENCE", location })
      if (!ref || ref.oldId === ref.newId) continue
      if (names[column] === "id_entente") cells.push({ workbook: source.workbook, sheet: source.sheet, row: index + 2, column: names[column], before: value as string, after: ref.newId })
      else issues.push({ kind: "UNCLASSIFIED_REFERENCE_REQUIRES_REVIEW", location })
    }
  }
  return { version: 1, reviewable: issues.length === 0, executable: false, inventoryComplete: snapshot.inventoryComplete === true, mapping, cells, issues }
}
