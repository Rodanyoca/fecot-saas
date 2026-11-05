"use client"
import { usePathname } from "next/navigation"
import { dashboardNavigation } from "@/lib/navigation"
import { Header } from "./header"
export function Shell({ children, bare = false }: { children: React.ReactNode; bare?: boolean }) {
 const pathname = usePathname()
 const title = dashboardNavigation.flatMap(item => item.children ?? [item]).find(item => item.href === pathname)?.name ?? "FECOT"
 return <>{bare ? children : <><Header title={title} /><div className="mx-auto max-w-7xl p-4 sm:p-8">{children}</div></>}</>
}
