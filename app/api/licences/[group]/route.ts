import { licencesGet, licencesWrite } from "@/lib/licences/api"
export const runtime = "nodejs"
type Context = { params: Promise<{ group: string }> }
export async function GET(request: Request, context: Context) { return licencesGet((await context.params).group, request) }
export async function POST(request: Request, context: Context) { return licencesWrite((await context.params).group, request) }
export const PUT = POST
export const PATCH = POST
