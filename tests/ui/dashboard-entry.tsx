import React from "react"
import { createRoot } from "react-dom/client"
import { ConnectedSummary } from "@/components/dashboard/connected-summary"
import { dashboardSummary } from "@/lib/dashboard-summary"
import { actorKinds, actorConfig } from "@/lib/actors/model"
import { Header } from "@/components/dashboard/header"
import { RefreshToolbar } from "@/components/dashboard/refresh-toolbar"
const root = createRoot(document.getElementById("root")!)
let currentMode = "normal", refreshes = 0
function render(mode: string) {
  currentMode = mode
  const rows = mode === "empty" ? [] : [{ statut: "ACTIF" }, { statut: "INACTIF" }, { statut: "" }]
  const territory = mode === "failure" ? null : Object.fromEntries(["LIGUES", "ENTENTES", "CLUBS"].map(key => [key, { rows }]))
  const actors = Object.fromEntries(actorKinds.map(kind => [actorConfig[kind].sheet, { rows }]))
  root.render(<><Header title="Tableau de bord" subtitle="Structure territoriale et acteurs FECOT"/><main className="space-y-8 p-4 md:p-6"><RefreshToolbar updatedAt={new Date(Date.UTC(2026, 10, 3, 12, refreshes)).toISOString()}/><ConnectedSummary data={dashboardSummary(territory, actors)}/></main></>)
}
Object.assign(window, { qaDashboard: render, qaRefresh: () => { refreshes++; render(currentMode) }, qaRefreshCount: () => refreshes }); render("normal")
