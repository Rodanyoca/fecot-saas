import { NextResponse } from "next/server"
import { getNavigationAccess, getSession } from "@/lib/auth"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null })
  }
  const access = session.doitChangerMotDePasse ? {} : await getNavigationAccess(session)
  return NextResponse.json({
    user: {
      id_user: session.idUser,
      nom_complet: session.nom,
      email: session.email,
      type_user: session.typeUser,
      est_super_admin: session.estSuperAdmin,
      doit_changer_mot_de_passe: session.doitChangerMotDePasse,
      access,
    },
  })
}
