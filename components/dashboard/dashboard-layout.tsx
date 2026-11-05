"use client"

import { useState } from "react"
import { filterNavigation, type NavigationAccess } from "@/lib/auth/navigation-access"
import { dashboardNavigation } from "@/lib/navigation"
import { DashboardNavigationProvider } from "./dashboard-navigation-context"
import { Sidebar } from "./sidebar"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"

interface DashboardLayoutProps {
  children: React.ReactNode
  initialUser: NavigationAccess
}

export function DashboardLayout({ children, initialUser }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigation = filterNavigation(dashboardNavigation, initialUser)
  return (
    <div className="flex min-h-dvh bg-background">
      <div className="sticky top-0 hidden h-dvh shrink-0 lg:block">
        <Sidebar navigation={navigation} />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 max-w-[88vw] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&_[data-slot=sheet-close]]:right-3 [&_[data-slot=sheet-close]]:top-5 [&_[data-slot=sheet-close]]:text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation principale</SheetTitle>
          <SheetDescription className="sr-only">Accéder aux modules de gestion FECOT</SheetDescription>
          <Sidebar navigation={navigation} collapsible={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
        <DashboardNavigationProvider value={() => setMobileOpen(true)}>
          <div className="min-w-0 flex-1">{children}</div>
        </DashboardNavigationProvider>
      </Sheet>
    </div>
  )
}
