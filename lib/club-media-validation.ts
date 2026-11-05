export function validateLogoData(type: string, size: number, bytes: Uint8Array) {
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
  if (!extensions[type] || size === 0 || size > 5 * 1024 * 1024 || bytes.length !== size) throw new Error("Logo invalide : JPG, PNG ou WebP de 5 Mo maximum.")
  const ascii = (start: number, end: number) => new TextDecoder().decode(bytes.subarray(start, end))
  const valid = type === "image/png" ? [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value) : type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : ascii(0,4) === "RIFF" && ascii(8,12) === "WEBP"
  if (!valid) throw new Error("Le contenu du logo ne correspond pas au format déclaré.")
  return extensions[type]
}
