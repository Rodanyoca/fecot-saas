"use client"

import { useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useTerritory } from "@/components/territorial/context"
import { SelectCity } from "@/components/territorial/select-city"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { CompactDateInput } from "@/components/ui/compact-date-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Ligue, Province } from "@/lib/types"
import { compactDateFromSheet } from "@/lib/compact-date"
import { Plus } from "lucide-react"

export type SavedLigue = Pick<Ligue, "idLigue" | "nomLigue" | "sigleLigue" | "telephone" | "emailLigue" | "idProvince" | "nomProvince" | "anneeCreation" | "dateAffiliation" | "statut" | "observations">

const normalizedStatus = (status?: string) => {
  const value = status?.trim().toUpperCase()
  if (value === "ACTIVE") return "ACTIF"
  if (value === "INACTIVE") return "INACTIF"
  return value || "ACTIF"
}

export function LigueFormDialog({ provinces, ligue, onSaved, trigger }: {
  provinces: Province[]
  ligue?: Ligue
  onSaved: (ligue: SavedLigue) => void
  trigger?: ReactNode
}) {
  const router = useRouter()
  const { canWrite, cities, ligues: contextLigues } = useTerritory()
  const editing = Boolean(ligue)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState("")
  const initialForm = {
    nomLigue: ligue?.nomLigue ?? "", sigleLigue: ligue?.sigleLigue ?? "",
    telephone: ligue?.telephone ?? "", emailLigue: ligue?.emailLigue ?? "",
    idProvince: ligue?.idProvince ?? "", anneeCreation: ligue?.anneeCreation ?? "",
    dateAffiliation: compactDateFromSheet(ligue?.dateAffiliation ?? ""),
    statut: normalizedStatus(ligue?.statut), observations: ligue?.observations ?? "",
  }
  const [form, setForm] = useState(initialForm)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setError("")
    setPending(true)
    try {
      const response = await fetch(editing ? `/api/ligues/${encodeURIComponent(ligue!.idLigue)}` : "/api/ligues", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || "Enregistrement impossible.")
      onSaved(result.ligue)
      router.refresh()
      toast.success(result.message)
      setOpen(false)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Enregistrement impossible."
      setError(message)
      toast.error(message)
    } finally { submitting.current = false; setPending(false) }
  }

  if (!canWrite) return null
  return <Sheet open={open} onOpenChange={(value) => { if (!pending) { if (value) { setForm(initialForm); setError("") }; setOpen(value) } }}>
    <SheetTrigger asChild>{trigger ?? <Button variant={editing ? "outline" : "default"} className={editing ? "hover:border-brand-gold/60 hover:bg-brand-gold/10 hover:text-brand-gold" : "bg-brand-gold text-[#071827] hover:bg-brand-gold/90"}>{!editing && <Plus className="size-4" />}{editing ? "Modifier la ligue" : "Ajouter une ligue"}</Button>}</SheetTrigger>
    <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{editing ? "Modifier" : "Ajouter"} une ligue</SheetTitle>
        <SheetDescription>L’identifiant est généré par le serveur et devient immuable.</SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} className="space-y-4 px-4 pb-24">
        {editing && <div className="space-y-2"><Label>Identifiant</Label><Input value={ligue?.idLigue ?? ""} disabled /></div>}
        <div className="grid gap-4"><div className="space-y-2"><Label htmlFor="fecot-sigleLigue">Sigle</Label><Input id="fecot-sigleLigue" value={form.sigleLigue} onChange={event => setForm({ ...form, sigleLigue: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="nom-ligue">Nom de la ligue *</Label><Input id="nom-ligue" required value={form.nomLigue} onChange={(event) => setForm({ ...form, nomLigue: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="fecot-idProvince">Province *</Label><Select required value={form.idProvince} onValueChange={(value) => setForm({ ...form, idProvince: value })}><SelectTrigger id="fecot-idProvince"><SelectValue placeholder="Sélectionner une province" /></SelectTrigger><SelectContent>{provinces.map((province) => <SelectItem key={province.idProvince} value={province.idProvince}>{province.nomProvince}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="telephone-ligue">Téléphone</Label><Input id="telephone-ligue" type="tel" value={form.telephone} onChange={(event) => setForm({ ...form, telephone: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="email-ligue">Adresse e-mail</Label><Input id="email-ligue" type="email" value={form.emailLigue} onChange={(event) => setForm({ ...form, emailLigue: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="annee-creation-ligue">Année de création</Label><Input id="annee-creation-ligue" inputMode="numeric" value={form.anneeCreation} onChange={(event) => setForm({ ...form, anneeCreation: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="date-affiliation-ligue">Date d’affiliation</Label><CompactDateInput id="date-affiliation-ligue" optional value={form.dateAffiliation} onValueChange={(dateAffiliation) => setForm({ ...form, dateAffiliation })} /></div>
          <div className="space-y-2"><Label htmlFor="fecot-statut">Statut</Label><Select value={form.statut} onValueChange={(value) => setForm({ ...form, statut: value })}><SelectTrigger id="fecot-statut"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIF">Actif</SelectItem><SelectItem value="INACTIF">Inactif</SelectItem></SelectContent></Select></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="observations-ligue">Observations</Label><Textarea id="observations-ligue" value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} /></div>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <SheetFooter className="px-0"><Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)} className={editing ? "hover:border-brand-gold/60 hover:bg-brand-gold/10 hover:text-brand-gold" : undefined}>Annuler</Button><Button type="submit" disabled={pending} className={editing ? "bg-brand-gold text-[#071827] hover:bg-brand-gold/90" : undefined}>{pending ? "Enregistrement…" : "Enregistrer"}</Button></SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
}
