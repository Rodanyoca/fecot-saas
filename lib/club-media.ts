import "server-only"
import { Readable } from "node:stream"
import { google } from "googleapis"
import { required } from "./territorial-store"
import { validateLogoData } from "./club-media-validation"

export const logoFolder = () => process.env.GOOGLE_DRIVE_CLUB_LOGOS_FOLDER_ID?.trim() || process.env.GOOGLE_DRIVE_CLUBS_FOLDER_ID?.trim() || ""
export function driveClient() {
  const auth = new google.auth.OAuth2(required("GOOGLE_CLIENT_ID"), required("GOOGLE_CLIENT_SECRET"))
  auth.setCredentials({ refresh_token: required("GOOGLE_REFRESH_TOKEN") })
  return google.drive({ version: "v3", auth })
}
export async function uploadLogo(id: string, file: File) {
  const types: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
  if (!types[file.type] || file.size === 0 || file.size > 5 * 1024 * 1024) throw new Error("Logo invalide : JPG, PNG ou WebP de 5 Mo maximum.")
  const buffer = Buffer.from(await file.arrayBuffer())
  validateLogoData(file.type, file.size, buffer)
  const folder = logoFolder()
  if (!folder) throw new Error("Configuration du dossier des logos absente.")
  const drive = driveClient()
  const result = await drive.files.create({ supportsAllDrives: true, requestBody: { name: `${id}.${types[file.type]}`, parents: [folder], appProperties: { entityType: "club", entityId: id, mediaType: "logo" } }, media: { mimeType: file.type, body: Readable.from(buffer) }, fields: "id" }, { timeout: 30000, retry: false })
  if (!result.data.id) throw new Error("Identifiant du logo absent.")
  return { drive, id: result.data.id, url: `/api/club-logos/${encodeURIComponent(result.data.id)}` }
}
