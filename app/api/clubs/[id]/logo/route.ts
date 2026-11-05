import { NextResponse } from "next/server"
import { requireTerritorialWrite, invalidateTerritory } from "@/lib/territorial-api"
import { readTables, writeRecord } from "@/lib/territorial-store"
import { getTerritorialData } from "@/lib/territorial-data"
import { uploadLogo } from "@/lib/club-media"
export const runtime = "nodejs"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireTerritorialWrite()
    if (denied) return denied
    const { id } = await params
    const { tables } = await readTables()
    if (!tables.CLUBS.rows.some(row => row.id_club === id)) return NextResponse.json({ message: "Club introuvable." }, { status: 404 })
    const length = Number(request.headers.get("content-length") || 0)
    if (length > 6 * 1024 * 1024) return NextResponse.json({ message: "Logo trop volumineux." }, { status: 413 })
    const file = (await request.formData()).get("logo")
    if (!(file instanceof File)) return NextResponse.json({ message: "Fichier logo requis." }, { status: 400 })
    const uploaded = await uploadLogo(id, file)
    try { await writeRecord("CLUBS", tables.CLUBS, id, { logo_drive_id: uploaded.id, logo_drive_url: uploaded.url }, true) }
    catch (error) {
      // Only remove the new orphan, never the previous logo.
      await uploaded.drive.files.delete({ fileId: uploaded.id, supportsAllDrives: true }).catch(() => undefined)
      throw error
    }
    invalidateTerritory()
    const club = (await getTerritorialData()).clubs.find(club => club.idClub === id)
    return NextResponse.json({ club, message: "Logo enregistré." })
  } catch (error) {
    if (error instanceof Error && /Logo invalide|contenu du logo/.test(error.message)) return NextResponse.json({ message: error.message }, { status: 422 })
    return NextResponse.json({ message: "Logo non enregistré. Vérifiez le format (JPG, PNG, WebP, 5 Mo maximum), la configuration OAuth et l’accès au dossier Drive." }, { status: 503 })
  }
}
