import { mutateTerritory, readTerritory } from "@/lib/territorial-api"
export const runtime = "nodejs"
export async function POST(request: Request) { return mutateTerritory("LIGUES", request) }

export async function GET() { return readTerritory("LIGUES") }
