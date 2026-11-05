"use client"
import { useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api/client"
export function AccountMenu() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("")
  async function logout() {
    if (busy) return
    setBusy(true);setError("")
    try {
      const response = await apiFetch("/api/auth/logout", { method: "POST" })
      if (!response.ok) throw new Error()
      window.location.replace("/login")
    } catch { setError("Déconnexion impossible. Réessayez.");setBusy(false) }
  }
  return <div className="flex shrink-0 items-center gap-2">
    <Button variant="outline" onClick={logout} disabled={busy} className="border-white/15 bg-white/[0.04] hover:border-primary/50 hover:bg-primary/10 hover:text-primary" aria-label="Se déconnecter"><LogOut className="mr-2 h-4 w-4" />{busy ? "Déconnexion…" : "Déconnexion"}</Button>
    {error && <p role="alert" className="max-w-40 text-xs text-destructive">{error}</p>}
  </div>
}
