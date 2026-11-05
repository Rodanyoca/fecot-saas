import { Suspense } from "react"
import { Header } from "@/components/dashboard/header"
import { RefreshToolbar } from "@/components/dashboard/refresh-toolbar"
import { ConnectedSummary } from "@/components/dashboard/connected-summary"
import { canAccess } from "@/lib/auth"
import { getCachedTerritorialTables } from "@/lib/territorial-data"
import { readActorSheets } from "@/lib/actors/service"
import { actorKinds, actorConfig } from "@/lib/actors/model"
import { dashboardSummary } from "@/lib/dashboard-summary"

export const dynamic = "force-dynamic"
async function Indicators() {
  if (!await canAccess("AUT-SPT", "READ").catch(() => false)) return <p role="alert">Vous ne disposez pas des droits de consultation de ces indicateurs.</p>
  const [territory, actors] = await Promise.allSettled([getCachedTerritorialTables(), readActorSheets("FECOT_ACTEURS_SPREADSHEET_ID", actorKinds.map(kind => actorConfig[kind].sheet))])
  const anySourceAvailable = territory.status === "fulfilled" || actors.status === "fulfilled"
  return <><RefreshToolbar updatedAt={anySourceAvailable ? new Date().toISOString() : null}/>{territory.status === "rejected" || actors.status === "rejected" ? <p role="alert" className="mb-6 text-sm text-muted-foreground">Certaines données sont momentanément indisponibles. Les indicateurs concernés ne sont pas remplacés par zéro.</p> : null}<ConnectedSummary data={dashboardSummary(territory.status === "fulfilled" ? territory.value.tables : null, actors.status === "fulfilled" ? actors.value : null)}/></>
}

export default function Dashboard() {
  return <div className="flex flex-col"><Header title="Tableau de bord" subtitle="Structure territoriale et acteurs FECOT"/><main className="flex-1 space-y-8 p-4 md:p-6">
    <Suspense fallback={<><RefreshToolbar updatedAt={null} loading/><p role="status">Chargement des indicateurs…</p></>}><Indicators/></Suspense>
  </main></div>
}
