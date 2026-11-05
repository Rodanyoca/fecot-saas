import {competitionsGet,competitionsWrite} from "@/lib/competitions/api"
export const dynamic="force-dynamic"
export const GET=(request:Request)=>competitionsGet(request)
export const POST=(request:Request)=>competitionsWrite(request)
