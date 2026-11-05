"use client"
import Link from "next/link"
import { useRef, useState } from "react"
import { apiFetch } from "@/lib/api/client"
import { AccountMenu } from "@/components/dashboard/account-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AccountClient({ user }: { user: { nom: string; email: string; type: string; statut: string; blocks: string[] } }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmation: "" })
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false)
  const locked = useRef(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (locked.current) return
    locked.current = true;setBusy(true);setMessage("");setFailed(false)
    try {
      const response = await apiFetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Modification impossible.")
      setMessage("Mot de passe modifié. Les autres sessions ont été révoquées.")
      setForm({ currentPassword: "", newPassword: "", confirmation: "" })
    } catch (error) { setFailed(true);setMessage(error instanceof Error ? error.message : "Service indisponible. Réessayez.") }
    finally { locked.current = false;setBusy(false) }
  }
  return <main className="mx-auto max-w-2xl space-y-8 p-5 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="text-sm underline">FECOT</Link><AccountMenu /></div>
    <div><p className="text-xs font-semibold uppercase tracking-widest text-brand-gold">Espace personnel</p><h1 className="mt-2 text-3xl font-bold">Mon compte</h1><p className="mt-3">{user.nom}</p><p className="break-words text-sm text-muted-foreground">{user.email} · {user.type} · {user.statut}</p><p className="mt-2 text-sm text-muted-foreground">Autorisations : {user.blocks.map(block => ({"AUT-SPT":"Gestion sportive","AUT-ADM":"Administration","AUT-COM":"Communication"}[block] || block)).join(", ") || "Aucune section attribuée. Contactez votre administrateur."}</p></div>
    <form onSubmit={submit} aria-busy={busy} className="space-y-5 rounded-xl border bg-card p-5 sm:p-7"><h2 className="text-lg font-semibold">Changer mon mot de passe</h2><p className="text-sm text-muted-foreground">Utilisez une phrase personnelle de 12 à 128 caractères.</p>
      {([["currentPassword", "Mot de passe actuel"], ["newPassword", "Nouveau mot de passe"], ["confirmation", "Confirmer le mot de passe"]] as const).map(([name,label]) => <div className="space-y-2" key={name}><Label htmlFor={name}>{label}</Label><Input id={name} type="password" autoComplete={name === "currentPassword" ? "current-password" : "new-password"} maxLength={128} disabled={busy} value={form[name]} onChange={event=>setForm({...form,[name]:event.target.value})} required /></div>)}
      {message && <p role={failed ? "alert" : "status"} className={failed ? "text-sm text-destructive" : "text-sm text-emerald-400"}>{message}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Modification…" : "Modifier le mot de passe"}</Button>
    </form>
  </main>
}
