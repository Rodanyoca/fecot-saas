"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function RefreshToolbar({ updatedAt, loading = false }: { updatedAt: string | null; loading?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const busy = loading || pending
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
    <p className="text-sm text-muted-foreground">{updatedAt ? <>Dernière actualisation : <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleString("fr-FR", { timeZone: "Africa/Kinshasa" })}</time></> : busy ? "Actualisation en cours" : "Actualisation indisponible"}</p>
    <Button variant="outline" onClick={() => { if (!busy) startTransition(() => router.refresh()) }} disabled={busy}>{busy ? "Actualisation..." : "Actualiser"}</Button>
  </div>
}
