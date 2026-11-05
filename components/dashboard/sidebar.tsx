"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentType } from "react"
import { useEffect, useRef, useState } from "react"
import { ArrowRightLeft, BadgeCheck, Building2, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CreditCard, FileText, Flag, LayoutDashboard, MapPin, Settings, Shield, Stethoscope, Trophy, UserCog, Users } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { hydrationSafePathname, isNavigationItemActive, type NavigationIcon, type NavigationItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const SIDEBAR_STORAGE_KEY = "fecot:sidebar-collapsed"

const icons: Record<NavigationIcon, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard, territory: Building2, league: MapPin, entente: Building2, club: Shield,
  actors: Users, athlete: Users, coach: UserCog, doctor: Stethoscope, referee: Flag, official: BadgeCheck, "other-actor": Users,
  movement: ArrowRightLeft, competition: Trophy, "national-team": Flag, activity: Calendar, document: FileText,
  license: CreditCard,
  settings: Settings,
}

type SidebarProps = { navigation: readonly NavigationItem[]; onNavigate?: () => void; collapsible?: boolean }

function NavLink({ item, collapsed, pathname, onNavigate }: { item: NavigationItem; collapsed: boolean; pathname: string; onNavigate?: () => void }) {
  if (!item.icon) return null
  const Icon = icons[item.icon]
  if (!item.href) return null
  const active = isNavigationItemActive(item, pathname)
  const link = (
    <Link href={item.href} onClick={() => { onNavigate?.(); window.dispatchEvent(new CustomEvent("fecot:navigate", { detail: item.href })) }} aria-current={active ? "page" : undefined} aria-label={collapsed ? item.name : undefined} className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar", active ? "bg-brand-gold text-[#071525]" : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground", collapsed && "justify-center px-2")}>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.name}</span>}
    </Link>
  )
  if (!collapsed) return link
  return <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right" sideOffset={10}>{item.name}</TooltipContent></Tooltip>
}

function NavGroup({ item, collapsed, pathname, open, setOpen, onNavigate }: { item: NavigationItem; collapsed: boolean; pathname: string; open: boolean; setOpen: (open: boolean) => void; onNavigate?: () => void }) {
  if (!item.children) return null
  if (collapsed) return <>{item.children.map((child) => <NavLink key={child.name} item={child} collapsed pathname={pathname} onNavigate={onNavigate} />)}</>
  const groupId = `navigation-group-${item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").toLowerCase()}`
  return <div className="space-y-1">
    <button type="button" onClick={() => setOpen(!open)} className="flex min-h-9 w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring" aria-expanded={open} aria-controls={groupId}>
      <span className="truncate">{item.name}</span>{open ? <ChevronUp className="size-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="size-4 shrink-0" aria-hidden="true" />}
    </button>
    <div id={groupId} hidden={!open} className="space-y-1 pl-2">
      {item.children.map((child) => <NavLink key={child.name} item={child} collapsed={false} pathname={pathname} onNavigate={onNavigate} />)}
    </div>
  </div>
}

export function Sidebar({ onNavigate, collapsible = true, navigation }: SidebarProps) {
  const routedPathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const pathname = hydrationSafePathname(routedPathname, hydrated)
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>(() => navigation.filter((item) => item.children).map((item) => item.name))
  const compact = collapsible && collapsed
  const knownGroups = useRef(new Set(navigation.filter(item => item.children).map(item => item.name)))

  useEffect(() => {
    const added = navigation.filter(item => item.children && !knownGroups.current.has(item.name)).map(item => item.name)
    navigation.forEach(item => { if (item.children) knownGroups.current.add(item.name) })
    if (added.length) setOpenGroups(current => [...new Set([...current, ...added])])
  }, [navigation])

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (collapsible) setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true")
  }, [collapsible])

  useEffect(() => {
    const activeGroups = navigation.filter((item) => item.children && isNavigationItemActive(item, pathname)).map((item) => item.name)
    if (activeGroups.length) setOpenGroups((current) => [...new Set([...current, ...activeGroups])])
  }, [pathname, navigation])

  const toggleCollapsed = () => setCollapsed((current) => {
    const next = !current
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
    return next
  })
  const setGroup = (name: string, open: boolean) => setOpenGroups((current) => open ? [...new Set([...current, name])] : current.filter((item) => item !== name))

  return <aside className={cn("relative z-40 flex h-full min-h-0 flex-col border-r border-sidebar-border bg-sidebar font-sans text-sidebar-foreground shadow-[16px_0_40px_rgba(1,10,20,0.22)] transition-[width] duration-300", compact ? "w-16" : "w-64")}>
    <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-[#1188c7] after:via-[#f6c515] after:to-[#e23b52]">
      <Link href="/" onClick={onNavigate} aria-label="FECOT — Tableau de bord" className={cn("flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", compact && "mx-auto")}>
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white"><Image unoptimized src="/logo-fecot.png" alt="Logo FECOT" width={40} height={40} className="size-full object-contain" priority /></span>
        {!compact && <span className="truncate text-lg font-black tracking-[0.12em]">FECOT</span>}
      </Link>
    </div>
    {collapsible && <button type="button" onClick={toggleCollapsed} className="absolute -right-3 top-20 z-50 flex size-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-muted shadow-md transition-colors hover:border-sidebar-primary/60 hover:bg-sidebar-accent hover:text-sidebar-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring" aria-label={compact ? "Déployer la navigation" : "Réduire la navigation"} aria-expanded={!compact}>{compact ? <ChevronRight className="size-4" aria-hidden="true" /> : <ChevronLeft className="size-4" aria-hidden="true" />}</button>}
    <nav aria-label="Navigation principale" className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {navigation.map((item) => item.children ? <NavGroup key={item.name} item={item} collapsed={compact} pathname={pathname} open={openGroups.includes(item.name)} setOpen={(open) => setGroup(item.name, open)} onNavigate={onNavigate} /> : <NavLink key={item.name} item={item} collapsed={compact} pathname={pathname} onNavigate={onNavigate} />)}
    </nav>
  </aside>
}
