/** Codes remain text. A full ID is accepted only with this exact parent prefix. */
export function ententeIdentity(ligue: unknown, code: unknown) {
  if (typeof ligue !== "string" || !ligue.trim()) throw new Error("Ligue obligatoire.")
  const idLigue = ligue.trim()
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(idLigue)) throw new Error("Identifiant de ligue invalide.")
  if (typeof code !== "string") throw new Error("Code invalide : utilisez une chaîne de deux chiffres.")
  const input = code.trim()
  const local = /^\d{2}$/.test(input) ? input : input.startsWith(idLigue) ? input.slice(idLigue.length) : ""
  if (!/^\d{2}$/.test(local)) throw new Error("Code invalide : deux chiffres locaux ou l’identifiant complet de cette ligue sont attendus.")
  return { idLigue, codeEntente: local, idEntente: idLigue + local }
}

export class EntenteKeyMigrationRequired extends Error {
  constructor() {
    super("La modification de la ligue ou du code nécessite une migration de la clé et de toutes ses références. Aucune modification enregistrée.")
  }
}
