"use client"

import { Activity, ArrowLeft, CalendarDays, Pencil, Shield, UserCog, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ClubFormDialog, type SavedClub } from "@/components/clubs/club-form-dialog"
import type { ClubReferenceOption } from "@/lib/club-references"
import type { Club, Entente } from "@/lib/types"
import { clubActorKpis, type ClubActor, type ClubActorGroups } from "@/lib/club-actors-model"
import { DataLoadNotice } from "@/components/dashboard/data-load-notice"

interface ClubDetailProps {
  club: Club
  actors: ClubActorGroups
  actorsAvailable: boolean
  ignoredRelations: number
  ententes: Entente[]
  categories: ClubReferenceOption[]
  sexes: ClubReferenceOption[]
  onBack: () => void
  onUpdated: (club: SavedClub) => void
}

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL"
}

function shown(value: unknown, fallback = "-") {
  const text = value === null || value === undefined ? "" : String(value).trim()
  return text || fallback
}

function SummaryTile({ icon: Icon, label, value, detail }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  detail?: string
}) {
  return <Card>
    <CardContent className="flex items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold">{shown(value)}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </div>
      <Icon className="h-6 w-6 shrink-0 text-brand-gold" />
    </CardContent>
  </Card>
}

function ClubActorTable({ title, showLicence = false, search, rows, available, extra }: { title: string; showLicence?: boolean; search: string; rows: ClubActor[]; available: boolean; extra?: string }) {
  const columns: Column<ClubActor>[] = [
    ...(showLicence ? [{ key: "licence", header: "Licence", render: () => "—" }] : []),
    { key: "nomComplet", header: "Nom complet", className: "font-medium" },
    { key: "sexe", header: "Sexe", render: actor => actor.sexe || "Non renseigné" },
    ...(extra ? [{ key: "fonction", header: extra, render: (actor: ClubActor) => actor.fonction || "Non renseigné" }] : []),
    { key: "telephone", header: "Téléphone", render: actor => actor.telephone || "Non renseigné" },
    { key: "email", header: "E-mail", className: "break-all", render: actor => actor.email || "Non renseigné" },
    { key: "statut", header: "Statut acteur", render: actor => <StatusBadge status={actor.statut} /> },
  ]
  return <Card className="min-w-0" role="region" aria-label={title}><CardHeader><CardTitle>{title}</CardTitle>{available && <p className="text-sm text-muted-foreground">{rows.length} personne{rows.length > 1 ? "s" : ""} rattachée{rows.length > 1 ? "s" : ""}</p>}</CardHeader><CardContent className="min-w-0">{available ? <DataTable data={rows} columns={columns} searchPlaceholder={search} idKey="id" tableClassName="min-w-[760px]" /> : <p className="text-sm text-muted-foreground">Le bloc Acteurs et affiliations FECOT n’est pas encore intégré. Aucun effectif n’est affiché.</p>}</CardContent></Card>
}

export function ClubDetail({ club, actors, actorsAvailable, ignoredRelations, ententes, categories, sexes, onBack, onUpdated }: ClubDetailProps) {
  const kpis = clubActorKpis(actors)
  const metric = (value: number) => actorsAvailable ? value.toLocaleString("fr-FR") : "Indisponible"

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Retour à la liste</Button>
      <ClubFormDialog club={club} ententes={ententes} categories={categories} sexes={sexes} onSaved={onUpdated}
        trigger={<Button className="bg-brand-gold text-[#071827] hover:bg-brand-gold/90"><Pencil className="h-4 w-4" />Modifier</Button>} />
    </div>

    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <Avatar className="size-20 shrink-0 rounded-xl border bg-background shadow-sm">
          <AvatarImage src={club.logoDriveUrl || undefined} alt={`Logo de ${club.nomClub}`} className="object-contain p-2" />
          <AvatarFallback className="rounded-xl text-lg font-semibold">{initials(club.nomClub)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0"><h2 className="truncate text-xl font-semibold">{shown(club.nomClub, "Club")}</h2><p className="mt-1 font-mono text-sm text-muted-foreground">{shown(club.idClub)}</p></div>
      </CardContent>
    </Card>

    <div className="grid gap-6 lg:grid-cols-2">
      <DetailCard title="Informations générales" icon={Shield} iconClassName="text-brand-gold" fields={[
        { label: "ID Club", value: club.idClub }, { label: "Nom du club", value: club.nomClub },
        { label: "Ville", value: club.ville }, { label: "Statut", value: club.statut },
        { label: "Téléphone", value: club.telephone }, { label: "E-mail", value: club.email }, { label: "Sigle", value: club.sigleClub }, { label: "Code", value: club.codeClub }, { label: "Observation", value: club.observations },
      ]} />
      <DetailCard title="Affiliation" icon={CalendarDays} iconClassName="text-brand-gold" fields={[
        { label: "Catégorie", value: club.categorie },
        { label: "Entente", value: club.sigleEntente || "Non renseigné", title: club.nomEntente },
        { label: "Ligue", value: club.sigleLigue || "Non renseigné", title: club.nomLigue },
        { label: "Version", value: club.version },
        { label: "Date de création", value: club.dateCreation }, { label: "Date d’affiliation", value: club.dateAffiliationClub },
      ]} />
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryTile icon={Users} label="Acteurs rattachés" value={metric(kpis.total)} detail="Toutes les familles du club" />
      <SummaryTile icon={Users} label="Athlètes" value={metric(kpis.athletes)} />
      <SummaryTile icon={UserCog} label="Encadrement" value={metric(kpis.staff)} detail="Entraîneurs, médecins, officiels et autres acteurs" />
      <SummaryTile icon={Activity} label="Acteurs actifs" value={metric(kpis.active)} detail="Selon le statut de la fiche acteur" />
    </div>

    <DataLoadNotice visible={ignoredRelations > 0} description="Certaines affiliations de la source sont invalides ou pointent vers un acteur absent. Elles sont exclues des effectifs." />
    <ClubActorTable title="Athlètes du club" showLicence search="Rechercher un athlète..." rows={actors.athletes} available={actorsAvailable} />
    <ClubActorTable title="Entraîneurs du club" showLicence search="Rechercher un entraîneur..." rows={actors.coachs} available={actorsAvailable} />
    <ClubActorTable title="Médecins du club" search="Rechercher un médecin..." rows={actors.medecins} available={actorsAvailable} />
    <ClubActorTable title="Officiels du club" search="Rechercher un officiel..." rows={actors.officiels} available={actorsAvailable} extra="Fonction" />
  </div>
}
