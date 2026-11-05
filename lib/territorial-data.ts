import "server-only"
import { cache } from "react"
import { unstable_cache } from "next/cache"
import { readTables, required } from "./territorial-store"
import { mapTerritory } from "./territorial-view-model"
export const TERRITORIAL_CACHE_TAG = "fecot-territory"
export async function getCachedTerritorialTables() {
  const ids = [required("FECOT_STRUCTURE_TERRITORIALE_SPREADSHEET_ID"), required("FECOT_REFERENTIELS_SPREADSHEET_ID")]
  return unstable_cache(readTables, [TERRITORIAL_CACHE_TAG, ...ids], { revalidate: 30, tags: [TERRITORIAL_CACHE_TAG] })()
}
export const getTerritorialData = cache(async () => { const { tables, refs } = await getCachedTerritorialTables(); return mapTerritory(tables, refs) })
