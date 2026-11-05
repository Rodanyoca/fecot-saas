import type { Club } from "@/lib/types"
type SheetRow = Record<string, unknown>

function str(row: SheetRow, key: string): string {
  const v = row[key]
  return v === null || v === undefined ? "" : String(v).trim()
}

function normalizeStatut(raw: string): string {
  const v = raw.trim().toLowerCase()
  if (v === "actif" || v === "active") return "actif"
  if (v === "inactif" || v === "inactive") return "inactif"
  return raw.trim()
}

export function mapClubRow(row: SheetRow): Club {
  const statutRaw = str(row, "statut") || str(row, "staut")

  return {
    idClub: str(row, "id_club"),
    codeClub: str(row, "code_club"),
    nomClub: str(row, "nom_club"),
    dateAffiliationClub: str(row, "date_affiliation"),
    idEntente: str(row, "id_entente"),
    nomEntente: str(row, "nom_entente"),
    sigleEntente: str(row, "sigle_entente"),
    idLigue: str(row, "id_ligue"),
    nomLigue: str(row, "nom_ligue"),
    sigleLigue: str(row, "sigle_ligue"),
    observations: str(row, "observations"),
    id: str(row, "id_club"),
    numeroOrdre: str(row, "code_club") || str(row, "numero_ordre_club"),
    nom: str(row, "nom_club"),
    categorie: str(row, "nom_categorie_club") || str(row, "id_categorie_club"),
    idCategorieClub: str(row, "id_categorie_club"),
    idSexe: str(row, "id_sexe"),
    idVille: str(row, "id_ville"),
    ville: str(row, "nom_ville") || str(row, "id_ville"),
    idLigueHistorique: str(row, "id_ligue_historique"),
    idNiveauCompetitifClub: str(row, "id_niveau_competitif_club"),
    idClubCoc: str(row, "id_club_coc"),
    sigleClub: str(row, "sigle_club"),
    dateCreation: str(row, "date_creation"),
    telephone: str(row, "telephone"),
    email: str(row, "email"),
    logoDriveId: str(row, "logo_drive_id"),
    logoDriveUrl: str(row, "logo_drive_url"),
    provinceId: str(row, "id_province"),
    provinceNom: str(row, "nom_province"),
    ligueId: str(row, "id_ligue"),
    ligueNom: str(row, "nom_ligue"),
    ententeId: str(row, "id_entente"),
    ententeNom: str(row, "nom_entente"),
    pseudoEntente: str(row, "pseudo_entente"),
    version: str(row, "nom_sexe") || str(row, "id_sexe"),
    dateAffiliation: str(row, "date_affiliation"),
    personneContactNom: str(row, "nom_personne_contact"),
    personneContactTelephone: str(row, "telephone_personne_contact"),
    presidentId: str(row, "id_president_club"),
    presidentNom: str(row, "nom_president_club") || str(row, "nom_personne_contact"),
    presidentTelephone: str(row, "telephone_president_club") || str(row, "telephone_personne_contact"),
    presidentEmail: str(row, "email_president_club"),
    adresse: str(row, "adresse_club"),
    statut: normalizeStatut(statutRaw),
  }
}
