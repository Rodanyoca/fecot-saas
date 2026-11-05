// Isolated rendering of the actual routes. No production session or Google access.
import React from "react"
import {createRoot} from "react-dom/client"
import {DashboardLayout} from "@/components/dashboard/dashboard-layout"
import NationalTeams from "@/app/(dashboard)/equipe-nationale/page"
import Activities from "@/app/(dashboard)/activites/page"
import Documents from "@/app/(dashboard)/documents/page"
import Settings from "@/app/(dashboard)/parametres/page"
const pages={teams:NationalTeams,activities:Activities,documents:Documents,settings:Settings}
const root=createRoot(document.getElementById("root")!)
window.fetch=async()=>Response.json({user:{est_super_admin:true,access:{}}})
const render=(key:keyof typeof pages)=>{const Page=pages[key];root.render(<DashboardLayout initialUser={{estSuperAdmin:true,access:{}}}><Page/></DashboardLayout>)}
Object.assign(window,{qaComingSoon:render});render("teams")
