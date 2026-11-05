import {actorMediaGet,actorMediaPut} from "@/lib/actors/media"
export const runtime="nodejs"
type Context={params:Promise<{kind:string;id:string;type:string}>}
export async function GET(_:Request,{params}:Context){const p=await params;return actorMediaGet(p.kind,p.id,p.type)}
export async function PUT(request:Request,{params}:Context){const p=await params;return actorMediaPut(p.kind,p.id,p.type,request)}
