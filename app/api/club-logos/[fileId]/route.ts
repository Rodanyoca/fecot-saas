import { getCachedTerritorialTables } from "@/lib/territorial-data"
import { driveClient } from "@/lib/club-media"
export const runtime = "nodejs"
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await params
    const { tables } = await getCachedTerritorialTables()
    if (!tables.CLUBS.rows.some(row => row.logo_drive_id === fileId)) return new Response(null, { status: 404 })
    const drive = driveClient()
    const metadata = await drive.files.get({ fileId, supportsAllDrives: true, fields: "mimeType,size" }, { timeout: 15000, retry: false })
    if (!["image/png", "image/jpeg", "image/webp"].includes(metadata.data.mimeType || "") || Number(metadata.data.size || 0) > 5 * 1024 * 1024) return new Response(null, { status: 415 })
    const result = await drive.files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer", timeout: 15000, retry: false })
    return new Response(Buffer.from(result.data as ArrayBuffer), { headers: { "Content-Type": metadata.data.mimeType!, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } })
  } catch { return new Response(null, { status: 503 }) }
}
