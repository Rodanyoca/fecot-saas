// Isolated browser harness: real FECOT read snapshot, writes only to memory.
import React from "react"
import { createRoot } from "react-dom/client"
import snapshot from "../data/fecot-territory.json"
import { mapTable, schema } from "@/lib/territorial-schema"
import { prepareRecord } from "@/lib/territorial-domain"
import { mapTerritory } from "@/lib/territorial-view-model"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TerritoryPage } from "@/components/territorial/page-client"

const tables = {
  LIGUES: mapTable(snapshot.tables.LIGUES, schema.LIGUES),
  ENTENTES: mapTable(snapshot.tables.ENTENTES, schema.ENTENTES),
  CLUBS: mapTable(snapshot.tables.CLUBS, schema.CLUBS),
}
const refs = {
  PROVINCES: mapTable(snapshot.refs.PROVINCES, ["id_province", "nom_province"]),
  VILLES: mapTable(snapshot.refs.VILLES, ["id_ville", "id_province", "nom_ville"]),
  CATEGORIES_CLUB: mapTable(snapshot.refs.CATEGORIES_CLUB, ["id_categorie_club", "nom_categorie_club"]),
  SEXES: mapTable(snapshot.refs.SEXES, ["id_sexe", "nom_sexe"]),
}
const root = createRoot(document.getElementById("root")!)
let kind: "ligues" | "ententes" | "clubs" = "ligues", writable = true, counter = 0
const render = () => root.render(<DashboardLayout initialUser={{ estSuperAdmin: true, access: {} }}><TerritoryPage kind={kind} data={mapTerritory(tables, refs)} canWrite={writable} error="" /></DashboardLayout>)
Object.assign(window, { qaRender: (next: typeof kind, canWrite = true) => { kind = next; writable = canWrite; render() }, qaRefresh: render, qaTables: tables })
window.fetch = async (url, options) => {
  if (String(url) === "/api/auth/session") return new Response(JSON.stringify({ user: { est_super_admin: true, access: { "AUT-SPT:READ": true, "AUT-SPT:WRITE": writable } } }))
  const match = String(url).match(/^\/api\/(ligues|ententes|clubs)(?:\/([^/]+))?$/)
  if (!match || !writable) return new Response("{}", { status: 403 })
  const sheet = match[1].toUpperCase() as keyof typeof tables
  try {
    const result = prepareRecord(sheet, JSON.parse(String(options?.body)), tables, refs, match[2], `FECOT-QA-${++counter}`)
    const idKey = schema[sheet][0]
    if (match[2]) Object.assign(tables[sheet].rows.find(row => row[idKey] === match[2])!, result.record)
    else tables[sheet].rows.push(result.record)
    const data = mapTerritory(tables, refs)
    const singular = match[1].slice(0, -1)
    const id = sheet === "LIGUES" ? "idLigue" : sheet === "ENTENTES" ? "idEntente" : "idClub"
    const saved = (data[match[1] as keyof Pick<typeof data, "ligues" | "ententes" | "clubs">] as unknown as Record<string, unknown>[]).find(row => row[id] === result.id)
    return new Response(JSON.stringify({ [singular]: saved, message: "Enregistré en mémoire de test." }), { status: 200 })
  } catch (error) { return new Response(JSON.stringify({ message: error instanceof Error ? error.message : "Erreur" }), { status: 422 }) }
}
render()
