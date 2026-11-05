import {competitionsGet,competitionsWrite} from "@/lib/competitions/api"
type Context={params:Promise<{id:string;section:string}>}
export const dynamic="force-dynamic"
export async function GET(request:Request,context:Context){const p=await context.params;return competitionsGet(request,p.id,p.section)}
export async function POST(request:Request,context:Context){const p=await context.params;return competitionsWrite(request,p.id,p.section)}
export const PUT=POST
