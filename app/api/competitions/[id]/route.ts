import {competitionsGet,competitionsWrite} from "@/lib/competitions/api"
type Context={params:Promise<{id:string}>}
export const dynamic="force-dynamic"
export async function GET(request:Request,context:Context){return competitionsGet(request,(await context.params).id)}
export async function PUT(request:Request,context:Context){return competitionsWrite(request,(await context.params).id)}
