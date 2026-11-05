"use client"

import { createContext, useContext } from "react"

const DashboardNavigationContext = createContext<(() => void) | null>(null)

export const DashboardNavigationProvider = DashboardNavigationContext.Provider

export function useDashboardNavigation() {
  return useContext(DashboardNavigationContext)
}
