"use client"

import { create } from "zustand"

interface TenantState {
  tenantId: number | null
  set: (id: number | null) => void
}

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: null,
  set: (tenantId) => set({ tenantId }),
}))
