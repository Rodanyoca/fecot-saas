const COMPACT_DATE = /^(\d{2})(\d{2})(\d{4})$/
const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/
const FRENCH_DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/

export type DateParts = { day: number; month: number; year: number }

export function sanitizeDateInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8)
}

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

function validParts(day: number, month: number, year: number): DateParts | null {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return null
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? { day, month, year }
    : null
}

function parseExplicitDate(value: string): DateParts | null {
  const raw = value.trim()
  if (!raw) return null

  const isoMatch = raw.match(ISO_DATE)
  if (isoMatch) {
    const day = Number(isoMatch[3])
    const month = Number(isoMatch[2])
    const year = Number(isoMatch[1])
    return validParts(day, month, year)
  }

  const frenchMatch = raw.match(FRENCH_DATE)
  if (frenchMatch) {
    const day = Number(frenchMatch[1])
    const month = Number(frenchMatch[2])
    const year = Number(frenchMatch[3])
    return validParts(day, month, year)
  }

  return null
}

export function formatCompactDateInput(value: string): string {
  const raw = value.trim()
  const explicitDate = parseExplicitDate(raw)
  if (explicitDate) {
    return `${pad2(explicitDate.day)}/${pad2(explicitDate.month)}/${explicitDate.year}`
  }

  const digits = sanitizeDateInput(raw)
  if (!digits) return ""
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  if (digits.length === 5) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
}

export function parseCompactDate(value: string): DateParts | null {
  const explicit = parseExplicitDate(value)
  if (explicit) return explicit

  const match = sanitizeDateInput(value).match(COMPACT_DATE)
  return match ? validParts(Number(match[1]), Number(match[2]), Number(match[3])) : null
}

function parseKnownDate(value: string): DateParts | null {
  const raw = value.trim()
  if (!raw) return null

  const explicit = parseExplicitDate(raw)
  if (explicit) return explicit

  const compact = sanitizeDateInput(raw).match(COMPACT_DATE)
  if (compact) {
    const day = Number(compact[1])
    const month = Number(compact[2])
    const year = Number(compact[3])
    return validParts(day, month, year)
  }

  return null
}

export function formatDateForSheet(value: string): string {
  if (!value.trim()) return ""
  const parts = parseKnownDate(value)
  if (!parts) throw new Error("Date invalide.")
  return `${String(parts.year).padStart(4, "0")}-${pad2(parts.month)}-${pad2(parts.day)}`
}

// Compatibilité de lecture des cellules date historiques Google Sheets.
// La validation des saisies reste celle de formatDateForSheet.
export function formatDateFromSheet(value: string): string {
  const raw = value.trim()
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const serial = Number(raw)
    if (serial > 0 && serial < 100000) {
      const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000)
      return formatDateForSheet(date.toISOString().slice(0, 10))
    }
  }
  return formatDateForSheet(raw)
}

export function formatDateForDisplay(value: string): string {
  if (!value.trim()) return ""
  const parts = parseKnownDate(value)
  if (!parts) return value.trim()
  return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`
}

export function compactDateFromSheet(value: string): string {
  const parts = parseKnownDate(value)
  if (!parts) return ""
  return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`
}

export function validateBirthDate(value: string, today = new Date()): string | null {
  if (!value) return null
  const parts = parseKnownDate(value)
  if (!parts) return "Saisissez une date valide sur 8 chiffres (JJMMAAAA)."
  const todayKey = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const birthKey = parts.year * 10000 + parts.month * 100 + parts.day
  return birthKey > todayKey ? "La date de naissance ne peut pas être future." : null
}

export function compareDateValues(left: string, right: string): number | null {
  const leftIso = left ? formatDateForSheet(left) : ""
  const rightIso = right ? formatDateForSheet(right) : ""
  if (!leftIso || !rightIso) return null
  return leftIso.localeCompare(rightIso)
}
