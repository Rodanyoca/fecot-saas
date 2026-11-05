import { mutateTerritory } from "@/lib/territorial-api"
export const runtime = "nodejs"
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { return mutateTerritory("ENTENTES", request, (await params).id) }
