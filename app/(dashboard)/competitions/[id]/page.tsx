import {CompetitionsPage} from "@/components/competitions/competitions-page"
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CompetitionsPage competitionId={id}/>}
