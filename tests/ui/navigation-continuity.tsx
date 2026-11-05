import React from "react"
import { createRoot } from "react-dom/client"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
const root = createRoot(document.getElementById("root")!)
const access = { estSuperAdmin: true, access: {} }
let resolveSession: (() => void) | undefined
window.fetch = () => new Promise(resolve => { resolveSession = () => resolve(new Response(JSON.stringify({ user: { est_super_admin: true, access: {} } }))) })
const render = (key: number) => root.render(<DashboardLayout initialUser={access}><p>Page {key}</p></DashboardLayout>)
Object.assign(window, { navRender: render, navResolve: () => resolveSession?.() })
render(0)
