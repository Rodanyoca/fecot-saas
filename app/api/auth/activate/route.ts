import { NextResponse } from "next/server"
import { createSession, getSession } from "@/lib/auth"
import { activateAccount } from "@/lib/auth/account-workflows"
import { authenticationWorkflowFailure } from "@/lib/auth/workflow-error"
import { postLoginRoute } from "@/lib/auth/post-login-route"
import { createGoogleUsersSheetsAdapter } from "@/lib/users/google-adapter"
import { getAuthorizationsForUser, getUserById } from "@/lib/users/data"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.doitChangerMotDePasse) return NextResponse.json({ error: "Accès invalide." }, { status: 401 })
  try {
    const body = await request.json()
    if (!body || typeof body.temporaryAccess !== "string" || typeof body.newPassword !== "string" || body.temporaryAccess.length > 1024 || body.newPassword !== body.confirmation) {
      return NextResponse.json({ error: "Vérifiez les informations saisies." }, { status: 400 })
    }
    const user = await getUserById(session.idUser)
    if (!user) return NextResponse.json({ error: "Accès invalide." }, { status: 401 })
    // Resolve the destination before consuming the temporary access.
    const authorizations = user.estSuperAdmin ? [] : await getAuthorizationsForUser(user.idUser)
    const updated = await activateAccount({ adapter: createGoogleUsersSheetsAdapter(), user, temporaryAccess: body.temporaryAccess, newPassword: body.newPassword })
    await createSession({ idUser: updated.idUser, sessionVersion: updated.sessionVersion })
    return NextResponse.json({ ok: true, redirectTo: postLoginRoute(updated, authorizations) })
  } catch (error) {
    const failure = authenticationWorkflowFailure(error, "Les informations saisies ne permettent pas d’activer le compte.")
    return NextResponse.json({ error: failure.message }, { status: failure.status })
  }
}
