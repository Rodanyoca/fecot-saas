type Row = Record<string, unknown>
export type ClubActorKind = "athletes" | "coachs" | "medecins" | "officiels" | "autres"
export type ClubActor = { id: string; nomComplet: string; sexe: string; telephone: string; email: string; statut: string; fonction: string }
export type ClubActorGroups = Record<ClubActorKind, ClubActor[]>
export type ClubActorsBundle = { byClub: Record<string, ClubActorGroups>; available: boolean; ignoredRelations: number }
const text = (value: unknown) => String(value ?? "").trim()
const normalize = (value: unknown) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
export const emptyClubActors = (): ClubActorGroups => ({ athletes: [], coachs: [], medecins: [], officiels: [], autres: [] })
export function clubActorKpis(groups: ClubActorGroups) {
  const athletes = groups.athletes.length
  const staff = groups.coachs.length + groups.medecins.length + groups.officiels.length + groups.autres.length
  const active = Object.values(groups).flat().filter(actor => ["ACTIF", "ACTIVE"].includes(normalize(actor.statut))).length
  return { total: athletes + staff, athletes, staff, active }
}
