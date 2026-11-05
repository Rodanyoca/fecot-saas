"use client"

import Link from "next/link"
import { ArrowLeft, Building2, CircleOff, Network, Pencil, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { EditEntenteDialog, type SavedEntente } from "@/components/ententes/entente-form-dialog"
import type { Athlete, Club, Entente, Ligue } from "@/lib/types"
import { formatDateForDisplay } from "@/lib/compact-date"

export function EntenteDetail({ entente, ligues, clubs, onBack, onUpdated }: { entente: Entente; ligues: Ligue[]; clubs: Club[]; athletes: Athlete[]; onBack: () => void; onUpdated: (entente: SavedEntente) => void }) {
  const relatedClubs = clubs.filter((club) => club.idEntente === entente.idEntente || club.ententeId === entente.idEntente)
  const activeClubs = relatedClubs.filter(club => ["ACTIF", "ACTIVE"].includes(club.statut.trim().toUpperCase())).length
  const inactiveClubs = relatedClubs.filter(club => ["INACTIF", "INACTIVE"].includes(club.statut.trim().toUpperCase())).length
  const columns: Column<Club>[] = [
    { key: "idClub", header: "ID Club", className: "font-mono text-sm" },
    { key: "nomClub", header: "Club", className: "font-medium" },
    { key: "sigleClub", header: "Sigle" },
    { key: "categorie", header: "Catégorie" },
    { key: "statut", header: "Statut", render: (club) => <StatusBadge status={club.statut} /> },
  ]

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 size-4" />Retour à la liste</Button>
      <EditEntenteDialog entente={entente} ligues={ligues} onSaved={onUpdated} trigger={<Button className="bg-brand-gold text-[#071827] hover:bg-brand-gold/90" aria-label={`Modifier ${entente.nomEntente}`} title="Modifier"><Pencil className="size-4" />Modifier</Button>} />
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <DetailCard title="Informations générales" icon={Network} iconClassName="text-brand-gold" fields={[{ label: "ID Entente", value: entente.idEntente }, { label: "Nom de l’entente", value: entente.nomEntente }, { label: "Sigle", value: entente.sigleEntente || entente.pseudoEntente }, { label: "Ligue", value: entente.nomLigue }, { label: "Ville", value: entente.ville }, { label: "Code", value: entente.codeEntente }, { label: "Statut", value: entente.statut }]} />
      <DetailCard title="Coordonnées et reconnaissance" icon={ShieldCheck} iconClassName="text-brand-gold" fields={[{ label: "Téléphone", value: entente.telephone }, { label: "E-mail", value: entente.emailEntente }, { label: "Date de création", value: formatDateForDisplay(entente.dateCreation ?? "") }, { label: "Date de reconnaissance", value: formatDateForDisplay(entente.dateReconnaissance ?? "") }, { label: "Observations", value: entente.observations }]} />
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <StatCard className="[&_svg]:text-brand-gold" title="Clubs" value={relatedClubs.length} icon={Building2} />
      <StatCard className="[&_svg]:text-brand-gold" title="Clubs actifs" value={activeClubs} icon={ShieldCheck} />
      <StatCard className="[&_svg]:text-brand-gold" title="Clubs inactifs" value={inactiveClubs} icon={CircleOff} />
    </div>

    <Card><CardHeader><CardTitle>Clubs de l’entente</CardTitle></CardHeader><CardContent><DataTable detailHref={item => `/clubs?id=${encodeURIComponent(item.idClub)}`} data={relatedClubs} columns={columns} searchPlaceholder="Rechercher un club..." idKey="idClub"
      renderMobileCard={club => <div className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{club.nomClub}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{club.idClub}</p></div><StatusBadge status={club.statut} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-muted-foreground">Sigle</p><p>{club.sigleClub || "Non renseigné"}</p></div><div><p className="text-muted-foreground">Catégorie</p><p>{club.categorie || "Non renseignée"}</p></div></div><Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link href={`/clubs?id=${encodeURIComponent(club.idClub)}`}>Voir le club</Link></Button></div>}
    /></CardContent></Card>
  </div>
}
