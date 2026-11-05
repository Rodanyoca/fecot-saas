import { affiliationsGet, affiliationsWrite } from "@/lib/affiliations/api"
export const runtime = "nodejs"
type Context = { params: Promise<{ kind: string; actorId: string }> }
export async function GET(request: Request, context: Context) { const { kind, actorId } = await context.params; return affiliationsGet(kind, actorId, request) }
export async function POST(request: Request, context: Context) { const { kind, actorId } = await context.params; return affiliationsWrite(kind, actorId, request) }
