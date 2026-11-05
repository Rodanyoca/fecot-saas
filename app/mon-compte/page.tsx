import { getNavigationAccess, getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import AccountClient from "./account-client"
export default async function AccountPage() { const session = await getSession(); if (!session || session.doitChangerMotDePasse) redirect("/login"); const access = await getNavigationAccess(); const blocks = (["AUT-ADM", "AUT-SPT", "AUT-COM"] as const).filter((block) => access[`${block}:READ`]); return <AccountClient user={{ nom: session.nom, email: session.email, type: session.typeUser, statut: session.statut, blocks }} /> }
