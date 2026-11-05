import { redirect } from "next/navigation"
import { getNavigationAccess, getSession } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.doitChangerMotDePasse) redirect("/activation")
  const access = await getNavigationAccess(session)
  return <DashboardLayout initialUser={{ estSuperAdmin: session.estSuperAdmin, access }}>{children}</DashboardLayout>
}
