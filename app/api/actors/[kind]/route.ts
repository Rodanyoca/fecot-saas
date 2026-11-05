import {actorsGet,actorsWrite} from "@/lib/actors/api"
export const runtime="nodejs"
export async function GET(request:Request,{params}:{params:Promise<{kind:string}>}){return actorsGet((await params).kind,request)}
export async function POST(request:Request,{params}:{params:Promise<{kind:string}>}){return actorsWrite((await params).kind,request)}
