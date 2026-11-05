import { affiliationsWrite } from "@/lib/affiliations/api"
export const runtime = "nodejs"
export async function PUT(request: Request, context: { params: Promise<{ kind: string; actorId: string; id: string }> }) { const { kind, actorId, id } = await context.params; return affiliationsWrite(kind, actorId, request, id) }
