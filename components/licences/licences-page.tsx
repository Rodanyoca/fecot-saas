import { canAccess } from "@/lib/auth"
import { LicencesClient } from "./licences-client"
import type { LicenceGroup } from "@/lib/licences/model"
export async function LicencesPage({ group }: { group: LicenceGroup }) { return <LicencesClient key={group} group={group} canWrite={await canAccess("AUT-SPT", "WRITE")}/> }
