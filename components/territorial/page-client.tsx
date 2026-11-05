"use client"
import { TerritoryContext } from "./context"
import { Shell } from "@/components/dashboard/shell"
import { LiguesClient } from "@/components/ligues/ligues-client"
import { EntentesClient } from "@/components/ententes/ententes-client"
import { ClubsClient } from "@/components/clubs/clubs-client"
import { DataLoadNotice } from "@/components/dashboard/data-load-notice"
import type { getTerritorialData } from "@/lib/territorial-data"

export type TerritoryData = Awaited<ReturnType<typeof getTerritorialData>>
export function TerritoryPage({ kind, data, canWrite, error }: { kind: "ligues" | "ententes" | "clubs"; data: TerritoryData; canWrite: boolean; error: string }) {
  return <TerritoryContext value={{ canWrite: canWrite && !error, cities: data.cities, ligues: data.ligues, categories: data.categories, sexes: data.sexes }}><Shell bare>
    <DataLoadNotice visible={Boolean(error)} description={error} />
    {kind === "ligues" ? <LiguesClient ligues={data.ligues} ententes={data.ententes} clubs={data.clubs} athletes={[]} provinceOptions={data.provinces} relationsReady={!error} /> : kind === "ententes" ? <EntentesClient ententes={data.ententes} ligues={data.ligues} clubs={data.clubs} athletes={[]} dataLoadError={Boolean(error)} /> : <ClubsClient clubs={data.clubs} ententes={data.ententes} categories={data.categories} sexes={data.sexes} actorData={{ available: false, byClub: {}, ignoredRelations: 0 }} dataLoadError={Boolean(error)} />}
  </Shell></TerritoryContext>
}
