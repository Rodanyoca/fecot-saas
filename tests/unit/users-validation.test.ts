import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { UsersDataError } from "../../lib/users/errors.ts"
import {
  assertExactHeaders,
  normalizeEmail,
  parseUser,
  parseUserAuthorization,
  validateUsersHeaders,
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
} from "../../lib/users/validation.ts"
// @ts-expect-error Node's TypeScript runner requires explicit extensions.
import { USER_HEADERS } from "../../lib/users/types.ts"

const validUserRow = {
  id_user: "USR-001",
  nom_complet: "Utilisateur Test",
  email: "  TEST@EXAMPLE.COM ",
  password_hash: "scrypt$v1$test",
  type_user: "ADMIN",
  est_super_admin: "FALSE",
  doit_changer_mot_de_passe: "TRUE",
  statut: "ACTIF",
  date_creation: "2026-08-31T10:00:00+01:00",
  date_modification_mot_de_passe: "",
  derniere_connexion: "",
  session_version: "1",
  date_expiration_acces_temporaire: "2026-09-01T10:00:00+01:00",
}

test("normalise un e-mail sans modifier sa partie interne", () => {
  assert.equal(normalizeEmail("  USER.Name+tag@Example.COM "), "user.name+tag@example.com")
})

test("valide les noms des en-têtes indépendamment de leur ordre", () => {
  assert.doesNotThrow(() => validateUsersHeaders([...USER_HEADERS]))
  assert.doesNotThrow(() => validateUsersHeaders([...USER_HEADERS].reverse()))
  assert.throws(
    () => assertExactHeaders("USERS", [...USER_HEADERS.slice(1), USER_HEADERS[1]], USER_HEADERS),
    (error: unknown) => error instanceof UsersDataError && error.code === "SCHEMA_INVALID"
  )
})

test("convertit une ligne utilisateur valide en modèle typé", () => {
  const user = parseUser(validUserRow, 2)
  assert.equal(user.email, "test@example.com")
  assert.equal(user.estSuperAdmin, false)
  assert.equal(user.doitChangerMotDePasse, true)
  assert.equal(user.sessionVersion, 1)
  assert.equal(user.dateModificationMotDePasse, null)
})

test("refuse les valeurs contrôlées, booléens et instants non conformes", () => {
  for (const invalidRow of [
    { ...validUserRow, type_user: "COC" },
    { ...validUserRow, est_super_admin: "oui" },
    { ...validUserRow, session_version: "0" },
    { ...validUserRow, date_creation: "2026-08-31 10:00:00" },
  ]) {
    assert.throws(
      () => parseUser(invalidRow, 2),
      (error: unknown) => error instanceof UsersDataError && error.code === "ROW_INVALID"
    )
  }
})

test("valide les dates calendaires et leur ordre", () => {
  const authorization = parseUserAuthorization({
    id_user_autorisation: "UA-001",
    id_user: "USR-001",
    id_bloc_autorisation: "AUT-SPT",
    statut: "ACTIF",
    date_debut: "2026-08-31",
    date_fin: "2026-09-30",
  }, 2)
  assert.equal(authorization.dateFin, "2026-09-30")

  assert.throws(
    () => parseUserAuthorization({
      id_user_autorisation: "UA-002",
      id_user: "USR-001",
      id_bloc_autorisation: "AUT-SPT",
      statut: "ACTIF",
      date_debut: "2026-02-30",
      date_fin: "",
    }, 3),
    (error: unknown) => error instanceof UsersDataError && error.code === "ROW_INVALID"
  )
})
