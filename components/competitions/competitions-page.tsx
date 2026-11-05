import {Suspense} from "react"
import {canAccess} from "@/lib/auth"
import {Header} from "@/components/dashboard/header"
import {CompetitionsClient} from "./competitions-client"
export function CompetitionsLoading(){return <><Header title="Compétitions"/><main className="p-4 md:p-6"><p role="status">Chargement…</p></main></>}
export async function CompetitionsPage({competitionId}:{competitionId?:string}){return <Suspense fallback={<CompetitionsLoading/>}><CompetitionsClient key={competitionId||"list"} competitionId={competitionId} canWrite={await canAccess("AUT-SPT","WRITE")}/></Suspense>}
