import { mutateTerritory, readTerritory } from "@/lib/territorial-api"
export const runtime = "nodejs"
export async function POST(request: Request) { return mutateTerritory("ENTENTES", request) }

export async function GET() { return readTerritory("ENTENTES") }
