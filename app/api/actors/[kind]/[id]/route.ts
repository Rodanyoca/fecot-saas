import {actorsGet,actorsWrite} from "@/lib/actors/api"
export const runtime="nodejs"
export async function GET(request:Request,{params}:{params:Promise<{kind:string;id:string}>}){const p=await params;return actorsGet(p.kind,request,p.id)}
export async function PUT(request:Request,{params}:{params:Promise<{kind:string;id:string}>}){const p=await params;return actorsWrite(p.kind,request,p.id)}
export const PATCH=PUT
