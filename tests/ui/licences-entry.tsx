import React from "react"
import { createRoot } from "react-dom/client"
import { LicencesClient } from "@/components/licences/licences-client"
import type { LicenceGroup } from "@/lib/licences/model"
const root = createRoot(document.getElementById("root")!)
let key = 0
const render = (group: LicenceGroup = "athletes", canWrite = true) => root.render(<LicencesClient key={++key} group={group} canWrite={canWrite}/>)
Object.assign(window, { qaLicences: render }); render()
