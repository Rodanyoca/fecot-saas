"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Eye, Pencil } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DataLoadNotice } from "@/components/dashboard/data-load-notice"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ClubDetail } from "@/components/clubs/club-detail"
import { ClubFormDialog, type SavedClub } from "@/components/clubs/club-form-dialog"
import type { ClubReferenceOption } from "@/lib/club-references"
import type { Club, Entente } from "@/lib/types"
import { emptyClubActors, type ClubActorsBundle } from "@/lib/club-actors-model"

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL"
}

export function ClubsClient({ clubs, actorData, ententes, categories, sexes, dataLoadError = false }: { clubs: Club[]; actorData: ClubActorsBundle; ententes: Entente[]; categories: ClubReferenceOption[]; sexes: ClubReferenceOption[]; dataLoadError?: boolean }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [rows, setRows] = useState(clubs)
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  useEffect(() => setRows(clubs), [clubs])
  useEffect(() => {
    const id = searchParams.get("id")
    setSelectedClub(current => clubs.find(item => item.idClub === (id || current?.idClub)) || null)
  }, [clubs, searchParams])
  useEffect(() => {
    const returnToList = (event: Event) => { if ((event as CustomEvent<string>).detail === "/clubs") setSelectedClub(null) }
    window.addEventListener("fecot:navigate", returnToList)
    return () => window.removeEventListener("fecot:navigate", returnToList)
  }, [])

  const applySavedClub = (saved: SavedClub) => {
    const previousId = saved.previousIdClub || saved.idClub
    setRows((current) => {
      const existing = current.find((club) => club.idClub === previousId)
      const merged: Club = { provinceId: "", provinceNom: "", personneContactNom: "", personneContactTelephone: "", presidentId: "", presidentNom: "", presidentTelephone: "", presidentEmail: "", adresse: "", ...existing, ...saved, id: saved.idClub, numeroOrdre: saved.codeClub, nom: saved.nomClub, ligueId: saved.idLigue, ligueNom: saved.nomLigue, ententeId: saved.idEntente, ententeNom: saved.nomEntente, dateAffiliation: saved.dateAffiliationClub }
      return existing ? current.map((club) => club.idClub === previousId ? merged : club) : [merged, ...current]
    })
    setSelectedClub((current) => current?.idClub === previousId ? { ...current, ...saved, id: saved.idClub, numeroOrdre: saved.codeClub, nom: saved.nomClub, ligueId: saved.idLigue, ligueNom: saved.nomLigue, ententeId: saved.idEntente, ententeNom: saved.nomEntente, dateAffiliation: saved.dateAffiliationClub } : current)
  }

  const logo = (club: Club, size = "size-10") => <Avatar className={`${size} rounded-lg border bg-background`}><AvatarImage src={club.logoDriveUrl || undefined} alt={`Logo de ${club.nomClub}`} className="object-contain p-1" /><AvatarFallback className="rounded-lg text-xs">{initials(club.nomClub)}</AvatarFallback></Avatar>
  const columns: Column<Club>[] = [
    { key: "idClub", header: "ID", className: "font-mono text-sm" },
    { key: "logoDriveUrl", header: "LOGO", render: (club) => logo(club) },
    { key: "nomClub", header: "CLUB", className: "font-medium" },
    { key: "categorie", header: "CATÉGORIE" },
    { key: "sigleEntente", header: "ENTENTE", render: club => <span title={club.nomEntente}>{club.sigleEntente || "Non renseigné"}</span> },
    { key: "sigleLigue", header: "LIGUE", render: club => <span title={club.nomLigue}>{club.sigleLigue || "Non renseigné"}</span> },
    { key: "statut", header: "STATUT", render: (club) => <StatusBadge status={club.statut} /> },
  ]
  const filters: Filter[] = useMemo(() => [
    ...(["Ligue", "Entente"] as const).map(label => {
      const key = label === "Ligue" ? "idLigue" : "idEntente"
      const options = [...new Map(rows.filter(club => club[key]).map(club => [club[key], { value: club[key], label: (label === "Ligue" ? club.sigleLigue : club.sigleEntente) || "Sigle non renseigné" }])).values()]
      const counts = new Map<string, number>()
      for (const option of options) counts.set(option.label, (counts.get(option.label) || 0) + 1)
      return { key, label, options: options.map(option => ({ ...option, label: (counts.get(option.label) || 0) > 1 ? `${option.label} (${option.value})` : option.label })).sort((a, b) => a.label.localeCompare(b.label, "fr")) }
    }),
    { key: "statut", label: "Statut", options: Array.from(new Set(rows.map((club) => club.statut).filter(Boolean))).sort().map((label) => ({ value: label, label })) },
  ], [rows])

  if (selectedClub) return <><Header title={`Fiche Club: ${selectedClub.nomClub || selectedClub.idClub}`} subtitle={selectedClub.sigleEntente || selectedClub.sigleLigue || "Détail du club"} /><main className="min-w-0 space-y-6 p-4 sm:p-6"><DataLoadNotice visible={dataLoadError} description="Une partie des données du club n’a pas pu être chargée. Les données disponibles restent affichées." /><ClubDetail key={selectedClub.idClub} club={selectedClub} actors={actorData.byClub[selectedClub.idClub] || emptyClubActors()} actorsAvailable={actorData.available} ignoredRelations={actorData.ignoredRelations} ententes={ententes} categories={categories} sexes={sexes} onBack={() => { setSelectedClub(null); router.replace("/clubs", { scroll: false }) }} onUpdated={applySavedClub} /></main></>

  return <><Header title="Clubs" subtitle="Clubs affiliés à la FECOT" /><main className="space-y-5 p-4 sm:p-6">
    <DataLoadNotice visible={dataLoadError} description="Une partie des données Clubs n’a pas pu être chargée. Les données disponibles restent affichées sans contenu fictif." />
    <div className="flex justify-end"><ClubFormDialog ententes={ententes} categories={categories} sexes={sexes} onSaved={applySavedClub} /></div>
    <DataTable tableClassName="font-sans [&_th]:font-sans [&_th]:uppercase [&_th_button]:uppercase" data={rows} columns={columns} filters={filters} searchPlaceholder="Rechercher un club..." idKey="idClub"
      renderActions={(club) => <><Button variant="ghost" size="icon" onClick={() => setSelectedClub(club)} aria-label={`Voir ${club.nomClub}`} title="Voir"><Eye className="size-4" /></Button><ClubFormDialog club={club} ententes={ententes} categories={categories} sexes={sexes} onSaved={applySavedClub} trigger={<Button variant="ghost" size="icon" className="hover:bg-brand-gold/10 hover:text-brand-gold" aria-label={`Modifier ${club.nomClub}`} title="Modifier"><Pencil className="size-4" /></Button>} /></>}
      renderMobileCard={(club) => <div className="rounded-xl border border-border/80 bg-card p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{logo(club, "size-12")}<div className="min-w-0"><p className="truncate font-semibold">{club.nomClub || "Club non renseigné"}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{club.idClub || "-"}</p></div></div><StatusBadge status={club.statut} /></div><div className="mt-3 space-y-1 text-sm text-muted-foreground"><p>Catégorie : {club.categorie || "Non renseignée"}</p><p title={club.nomEntente}>Entente : {club.sigleEntente || "Non renseigné"}</p><p title={club.nomLigue}>Ligue : {club.sigleLigue || "Non renseigné"}</p></div><div className="mt-4 flex justify-end"><Button variant="ghost" size="icon" onClick={() => setSelectedClub(club)} aria-label={`Voir ${club.nomClub}`}><Eye className="size-4" /></Button></div></div>}
    />
  </main></>
}
