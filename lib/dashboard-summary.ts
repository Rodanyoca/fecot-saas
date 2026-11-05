// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import { actorKinds, actorConfig } from "./actors/model.ts"

type Row = Record<string, string>
type Tables = Record<string, { rows: Row[] }>
export type SummaryRow = { label: string; href: string; total: number | null; active: number | null; inactive: number | null; unknown: number | null }
function summarize(label: string, href: string, rows?: Row[]): SummaryRow {
  if (!rows) return { label, href, total: null, active: null, inactive: null, unknown: null }
  let active = 0, inactive = 0, unknown = 0
  for (const row of rows) {
    const status = (row.statut || "").trim().toUpperCase()
    if (status === "ACTIF" || status === "ACTIVE") active++
    else if (status === "INACTIF" || status === "INACTIVE") inactive++
    else unknown++
  }
  return { label, href, total: rows.length, active, inactive, unknown }
}
export function dashboardSummary(territory: Tables | null, actors: Tables | null) {
  const structures = [summarize("Ligues", "/ligues", territory?.LIGUES?.rows), summarize("Ententes", "/ententes", territory?.ENTENTES?.rows), summarize("Clubs", "/clubs", territory?.CLUBS?.rows)]
  const people = actorKinds.map(kind => summarize(actorConfig[kind].title, `/${kind}`, actors?.[actorConfig[kind].sheet]?.rows))
  const sum = (rows: SummaryRow[], key: "total" | "active") => rows.some(row => row[key] === null) ? null : rows.reduce((total, row) => total + row[key]!, 0)
  return { structures, people, structureCount: sum(structures, "total"), actorCount: sum(people, "total"), activeActorCount: sum(people, "active") }
}
