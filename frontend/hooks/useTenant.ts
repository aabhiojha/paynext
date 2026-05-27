"use client"

import { useTenantStore } from "@/store/tenantStore"

export function useTenant() {
  const tenantId = useTenantStore((s) => s.tenantId)
  return { tenantId }
}
