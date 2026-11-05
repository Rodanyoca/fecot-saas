"use client"
import Image from "next/image"
import { useRef, useState } from "react"
import { apiFetch } from "@/lib/api/client"
import { normalizeLoginRedirect } from "@/lib/auth/login-redirect"
import { AccountMenu } from "@/components/dashboard/account-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
export default function ActivationPage() {
  const [form, setForm] = useState({ temporaryAccess: "", newPassword: "", confirmation: "" })
  const [error,setError] = useState(""),[saving,setSaving] = useState(false)
  const locked = useRef(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if(locked.current) return
    locked.current=true;setSaving(true);setError("")
    try {
      const response=await apiFetch("/api/auth/activate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)})
      const result=await response.json()
      if(!response.ok) throw new Error(result.error || "Activation impossible.")
      window.location.replace(normalizeLoginRedirect(result.redirectTo))
    }catch(cause){setError(cause instanceof Error?cause.message:"Activation impossible.");locked.current=false;setSaving(false)}
  }
  return <main className="grid min-h-dvh place-items-center p-4 sm:p-8"><section className="w-full max-w-md space-y-5">
    <div className="flex items-center justify-between"><Image unoptimized src="/logo-fecot.png" alt="FECOT" width={52} height={52} className="rounded-full bg-white p-1" /><AccountMenu /></div>
    <form onSubmit={submit} aria-busy={saving} className="space-y-5 rounded-xl border bg-card p-6 shadow-sm"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-gold">Première connexion</p><h1 className="text-2xl font-semibold">Activer votre compte</h1><p className="mt-3 text-sm text-muted-foreground">Remplacez l’accès temporaire par une phrase personnelle de 12 à 128 caractères.</p></div>
      {([["temporaryAccess","Accès temporaire"],["newPassword","Nouveau mot de passe"],["confirmation","Confirmer le mot de passe"]] as const).map(([name,label])=><div className="space-y-2" key={name}><Label htmlFor={name}>{label}</Label><Input id={name} type="password" autoComplete={name==="temporaryAccess"?"current-password":"new-password"} maxLength={128} disabled={saving} value={form[name]} onChange={event=>setForm({...form,[name]:event.target.value})} required /></div>)}
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={saving}>{saving?"Activation…":"Activer le compte"}</Button>
    </form>
  </section></main>
}
