import type { Athlete, Club, Entente, Ligue } from "@/lib/types"

export interface LigueHierarchy {
  ententes: Entente[]
  clubs: Club[]
  athletes: Athlete[]
  clubsByEntenteId: Map<string, Club[]>
  athletesByClubId: Map<string, Athlete[]>
  diagnostics: string[]
}

function uniqueById<T>(items: T[], getId: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const id = getId(item).trim()
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function buildLigueHierarchy(
  ligue: Pick<Ligue, "idLigue">,
  ententes: Entente[],
  clubs: Club[],
  athletes: Athlete[],
): LigueHierarchy {
  const diagnostics: string[] = []
  const ligueEntentes = uniqueById(
    ententes.filter((entente) => entente.idLigue === ligue.idLigue),
    (entente) => entente.idEntente,
  )
  const ententeIds = new Set(ligueEntentes.map((entente) => entente.idEntente))

  const ligueClubs = uniqueById(
    clubs.filter((club) => ententeIds.has(club.idEntente)),
    (club) => club.idClub,
  )
  for (const club of ligueClubs) {
    if (club.idLigue && club.idLigue !== ligue.idLigue) {
      diagnostics.push(`Club ${club.idClub}: id_ligue=${club.idLigue} incoherent avec l'entente ${club.idEntente}.`)
    }
  }

  const clubIds = new Set(ligueClubs.map((club) => club.idClub))
  const ligueAthletes = uniqueById(
    athletes.filter((athlete) => clubIds.has(athlete.clubId)),
    (athlete) => athlete.idAthlete,
  )

  const clubsByEntenteId = new Map<string, Club[]>()
  for (const club of ligueClubs) {
    clubsByEntenteId.set(club.idEntente, [...(clubsByEntenteId.get(club.idEntente) ?? []), club])
  }
  const athletesByClubId = new Map<string, Athlete[]>()
  for (const athlete of ligueAthletes) {
    athletesByClubId.set(athlete.clubId, [...(athletesByClubId.get(athlete.clubId) ?? []), athlete])
  }

  return { ententes: ligueEntentes, clubs: ligueClubs, athletes: ligueAthletes, clubsByEntenteId, athletesByClubId, diagnostics }
}
