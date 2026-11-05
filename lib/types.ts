export type Statut = string

export interface Province {
  idProvince: string
  nomProvince: string
  id: string
  nom: string
  chefLieu: string
  responsable: string
  telephone: string
  email: string
  statut: "active" | "inactive" | string

  ligues: number
  ententes: number
  clubs: number
  athletes: number
  coachs: number
  arbitres: number
  medecins: number
  completude: number
}

export interface Ligue {
  sigleLigue?: string
  idLigue: string
  nomLigue: string
  idProvince: string
  nomProvince: string
  observations: string
  id: string
  nom: string
  provinceId: string
  provinceNom: string
  emailLigue: string
  telephone?: string
  anneeCreation?: string
  dateAffiliation?: string
  presidentId: string
  presidentNom: string
  presidentTelephone: string
  presidentEmail: string
  secretaireId: string
  secretaireNom: string
  secretaireTelephone: string
  secretaireEmail: string
  statut: Statut

  // Optional legacy/display fields (if present in the sheet)
  ententes?: number
  clubs?: number
  athletes?: number
}

export interface Entente {
  idEntente: string
  codeEntente: string
  nomEntente: string
  pseudoEntente: string
  idLigue: string
  nomLigue: string
  emailEntente: string
  sigleEntente?: string
  idVille?: string
  ville?: string
  telephone?: string
  dateCreation?: string
  dateReconnaissance?: string
  observations: string
  id: string
  numeroOrdre: string
  nom: string
  pseudo: string
  ligueId: string
  ligueNom: string
  provinceId: string
  provinceNom: string
  statut: Statut

  // Optional computed/legacy fields (not present in the ENTENTES sheet today)
  clubs?: number
  athletes?: number
}

export interface Club {
  sigleEntente?: string
  sigleLigue?: string
  idClub: string
  codeClub: string
  nomClub: string
  dateAffiliationClub: string
  idEntente: string
  nomEntente: string
  idLigue: string
  nomLigue: string
  observations: string
  id: string
  numeroOrdre: string
  nom: string
  categorie: string
  idCategorieClub?: string
  idSexe?: string
  idVille?: string
  ville?: string
  idLigueHistorique?: string
  idNiveauCompetitifClub?: string
  idClubCoc?: string
  sigleClub?: string
  dateCreation?: string
  telephone?: string
  email?: string
  logoDriveId?: string
  logoDriveUrl?: string
  provinceId: string
  provinceNom: string
  ligueId: string
  ligueNom: string
  ententeId: string
  ententeNom: string
  pseudoEntente: string
  version: string
  dateAffiliation: string
  personneContactNom: string
  personneContactTelephone: string
  presidentId: string
  presidentNom: string
  presidentTelephone: string
  presidentEmail: string
  adresse: string
  statut: Statut

  // Optional computed fields
  athletes?: number
}

export interface Athlete { idAthlete: string; clubId: string }
