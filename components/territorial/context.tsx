"use client"
import { createContext, useContext } from "react"
import type { Ligue } from "@/lib/types"
export type TerritorialContext = { canWrite: boolean; cities: { id: string; nom: string; provinceId: string }[]; ligues: Ligue[]; categories: { id: string; nom: string }[]; sexes: { id: string; nom: string }[] }
export const TerritoryContext = createContext<TerritorialContext>({ canWrite: false, cities: [], ligues: [], categories: [], sexes: [] })
export const useTerritory = () => useContext(TerritoryContext)
