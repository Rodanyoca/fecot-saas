import {canAccess} from "@/lib/auth"
import {ActorsClient} from "./actors-client"
import type {ActorKind} from "@/lib/actors/model"
export async function ActorsPage({kind}:{kind:ActorKind}){return <ActorsClient key={kind} kind={kind} canWrite={await canAccess("AUT-SPT","WRITE")}/>}
