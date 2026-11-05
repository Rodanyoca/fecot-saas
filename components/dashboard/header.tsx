"use client"

import { AccountMenu } from "./account-menu"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboardNavigation } from "./dashboard-navigation-context"

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const openNavigation = useDashboardNavigation()

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-border/80 bg-background/90 px-4 py-3 shadow-[0_10px_30px_rgba(2,12,23,0.18)] backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="outline" size="icon" onClick={openNavigation ?? undefined} className="shrink-0 border-white/15 bg-white/[0.04] hover:border-brand-gold/60 hover:bg-brand-gold/10 hover:text-brand-gold lg:hidden" aria-label="Ouvrir la navigation principale">
          <Menu className="size-5" />
        </Button>
        <div className="min-w-0 border-l-2 border-brand-gold pl-3">
          <h1 className="truncate text-xl font-bold tracking-[-0.02em] text-foreground">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <AccountMenu />
    </header>
  )
}
