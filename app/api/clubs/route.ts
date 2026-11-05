import { mutateTerritory, readTerritory } from "@/lib/territorial-api"
export const runtime = "nodejs"
export async function POST(request: Request) { return mutateTerritory("CLUBS", request) }

export async function GET() { return readTerritory("CLUBS") }
