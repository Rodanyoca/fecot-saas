import type { Entente } from "@/lib/types"
// @ts-expect-error Node's test runner requires explicit TypeScript extensions.
import { ententeIdentity } from "../entente-id.ts"
type SheetRow = Record<string, unknown>

function str(row: SheetRow, key: string): string {
  const v = row[key]
  return v === null || v === undefined ? "" : String(v).trim()
}

function normalizeStatut(raw: string): string {
  const v = raw.trim().toLowerCase()
  if (v === "actif" || v === "active") return "active"
  if (v === "inactif" || v === "inactive") return "inactive"
  return raw.trim()
}

export function mapEntenteRow(row: SheetRow): Entente {
  const statutRaw = str(row, "statut") || str(row, "staut")
  let code = str(row, "code_entente")
  try { code = ententeIdentity(str(row, "id_ligue"), code).codeEntente }
  catch { /* Preserve ambiguous historical values for review; never invent a new key on read. */ }

  return {
    idEntente: str(row, "id_entente"),
    codeEntente: code,
    nomEntente: str(row, "nom_entente"),
    pseudoEntente: str(row, "sigle_entente"),
    idLigue: str(row, "id_ligue"),
    nomLigue: str(row, "nom_ligue"),
    emailEntente: str(row, "email"),
    sigleEntente: str(row, "sigle_entente"),
    idVille: str(row, "id_ville"),
    ville: str(row, "nom_ville") || str(row, "id_ville"),
    telephone: str(row, "telephone"),
    dateCreation: str(row, "date_creation"),
    dateReconnaissance: str(row, "date_reconnaissance"),
    observations: str(row, "observations"),
    id: str(row, "id_entente"),
    numeroOrdre: code || str(row, "numero_ordre_entente"),
    nom: str(row, "nom_entente"),
    pseudo: str(row, "sigle_entente"),
    ligueId: str(row, "id_ligue"),
    ligueNom: str(row, "nom_ligue"),
    provinceId: str(row, "id_province"),
    provinceNom: str(row, "nom_province"),
    statut: normalizeStatut(statutRaw),
  }
}
