import React from "react"
import { createRoot } from "react-dom/client"
import { AffiliationsPanel } from "@/components/affiliations/affiliations-panel"
import type { AffiliationKind } from "@/lib/affiliations/model"
const root = createRoot(document.getElementById("root")!)
let revision = 0
const render = (kind: AffiliationKind = "athletes", actorId = "ATH00001", canWrite = true) => root.render(<main className="p-4"><AffiliationsPanel key={++revision} kind={kind} actorId={actorId} canWrite={canWrite}/></main>)
Object.assign(window, { qaAffiliations: render }); render()
