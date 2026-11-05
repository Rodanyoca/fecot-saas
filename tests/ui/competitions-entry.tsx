import React from "react"
import {createRoot} from "react-dom/client"
import {CompetitionsClient} from "@/components/competitions/competitions-client"
import {usePathname} from "./competitions-navigation"
function App(){const path=usePathname(),id=path.split("/")[2];return <CompetitionsClient key={id||"list"} competitionId={id?decodeURIComponent(id):undefined} canWrite/>}
createRoot(document.getElementById("root")!).render(<App/>)
