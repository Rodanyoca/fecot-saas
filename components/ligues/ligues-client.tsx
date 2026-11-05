"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Eye, MapPin, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { LigueDetail } from "@/components/ligues/ligue-detail"
import { LigueFormDialog, type SavedLigue } from "@/components/ligues/ligue-form-dialog"
import { Header } from "@/components/dashboard/header"
import type { Athlete, Club, Entente, Ligue, Province } from "@/lib/types"

export function LiguesClient({ ligues, ententes, clubs, athletes, provinceOptions, relationsReady }: {
  ligues: Ligue[]; ententes: Entente[]; clubs: Club[]; athletes: Athlete[]
  provinceOptions: Province[]; relationsReady: boolean
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [rows, setRows] = useState(ligues)
  const [selectedLigue, setSelectedLigue] = useState<Ligue | null>(null)
  useEffect(() => setRows(ligues), [ligues])
  useEffect(() => {
    const id = searchParams.get("id")
    setSelectedLigue(current => ligues.find(item => item.idLigue === (id || current?.idLigue)) || null)
  }, [ligues, searchParams])
  useEffect(() => {
    const returnToList = (event: Event) => {
      if ((event as CustomEvent<string>).detail === "/ligues") setSelectedLigue(null)
    }
    window.addEventListener("fecot:navigate", returnToList)
    return () => window.removeEventListener("fecot:navigate", returnToList)
  }, [])

  const applySavedLigue = (saved: SavedLigue) => {
    setRows((current) => {
      const existing = current.find((item) => item.idLigue === saved.idLigue)
      const merged: Ligue = { presidentId: "", presidentNom: "", presidentTelephone: "", presidentEmail: "", secretaireId: "", secretaireNom: "", secretaireTelephone: "", secretaireEmail: "", ...existing, ...saved, id: saved.idLigue, nom: saved.nomLigue, provinceId: saved.idProvince, provinceNom: saved.nomProvince }
      return existing ? current.map((item) => item.idLigue === saved.idLigue ? merged : item) : [merged, ...current]
    })
    setSelectedLigue((current) => current?.idLigue === saved.idLigue ? { ...current, ...saved, id: saved.idLigue, nom: saved.nomLigue, provinceId: saved.idProvince, provinceNom: saved.nomProvince } : current)
  }

  const columns: Column<Ligue>[] = [
    { key: "idLigue", header: "ID", className: "font-mono text-sm" },
    { key: "nomLigue", header: "LIGUE", className: "font-medium" },
    { key: "sigleLigue", header: "SIGLE", render: ligue => ligue.sigleLigue || "Non renseigné" },
    { key: "nomProvince", header: "PROVINCE" },
    { key: "statut", header: "STATUT", render: (ligue) => <StatusBadge status={ligue.statut} /> },
  ]
  const filters: Filter[] = useMemo(() => [
    { key: "nomProvince", label: "Province", options: Array.from(new Set(rows.map((ligue) => ligue.nomProvince).filter(Boolean))).sort().map((label) => ({ value: label, label })) },
    { key: "statut", label: "Statut", options: Array.from(new Set(rows.map((ligue) => ligue.statut).filter(Boolean))).sort().map((label) => ({ value: label, label })) },
  ], [rows])

  if (selectedLigue) return <><Header title={`Fiche Ligue : ${selectedLigue.nomLigue || selectedLigue.idLigue}`} subtitle={selectedLigue.nomProvince || "Détail de la ligue"} /><main className="space-y-6 p-4 sm:p-6"><LigueDetail ligue={selectedLigue} ententes={ententes} clubs={clubs} athletes={athletes} provinces={provinceOptions} onBack={() => { setSelectedLigue(null); router.replace("/ligues", { scroll: false }) }} onUpdated={applySavedLigue} relationsReady={relationsReady} /></main></>

  return <><Header title="Ligues" subtitle="Liste et administration des ligues provinciales" /><main className="space-y-5 p-4 sm:p-6">
    <div className="flex justify-end"><LigueFormDialog provinces={provinceOptions} onSaved={applySavedLigue} /></div>
    <DataTable tableClassName="font-sans [&_th]:font-sans [&_th]:uppercase [&_th_button]:uppercase" data={rows} columns={columns} filters={filters} searchPlaceholder="Rechercher une ligue..." idKey="idLigue"
      renderActions={(ligue) => <><Button variant="ghost" size="icon" onClick={() => setSelectedLigue(ligue)} aria-label={`Voir ${ligue.nomLigue}`} title="Voir"><Eye className="size-4" /></Button><LigueFormDialog ligue={ligue} provinces={provinceOptions} onSaved={applySavedLigue} trigger={<Button variant="ghost" size="icon" className="hover:bg-brand-gold/10 hover:text-brand-gold" aria-label={`Modifier ${ligue.nomLigue}`} title="Modifier"><Pencil className="size-4" /></Button>} /></>}
      renderMobileCard={(ligue) => <div className="rounded-xl border border-border/80 bg-card p-4"><div className="flex items-start justify-between"><div className="min-w-0"><p className="truncate font-semibold">{ligue.nomLigue}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{ligue.idLigue}</p></div><StatusBadge status={ligue.statut} /></div><p className="mt-3 break-words text-sm text-muted-foreground">Sigle : {ligue.sigleLigue || "Non renseigné"}</p><p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4 text-primary" />{ligue.nomProvince || "Province non renseignée"}</p><div className="mt-4 flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => setSelectedLigue(ligue)} aria-label={`Voir ${ligue.nomLigue}`}><Eye className="size-4" /></Button><LigueFormDialog ligue={ligue} provinces={provinceOptions} onSaved={applySavedLigue} trigger={<Button variant="ghost" size="icon" className="hover:bg-brand-gold/10 hover:text-brand-gold" aria-label={`Modifier ${ligue.nomLigue}`}><Pencil className="size-4" /></Button>} /></div></div>}
    />
  </main></>
}
