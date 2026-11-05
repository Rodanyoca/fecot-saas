export function describeAuthenticationFailure(error: unknown) {
  const details = error instanceof Error ? error.message : String(error ?? "Erreur inconnue")

  const isConfigurationIssue = /auth_secret|fecot_users_spreadsheet_id|google_sheets_users_spreadsheet_id|google_service_account_email|google_private_key|google_oauth_client_id|google_oauth_client_secret|missing.*environment|est manquant|absent de l'environnement/i.test(details)

  if (isConfigurationIssue) {
    return {
      status: 503,
      message: "La configuration de l’authentification est incomplète. Vérifiez AUTH_SECRET et FECOT_USERS_SPREADSHEET_ID dans les variables d’environnement.",
    }
  }

  return {
    status: 503,
    message: "Le service de connexion est momentanément indisponible.",
  }
}
