"use client"

import { useEffect } from "react"
import { useTenantStore } from "@/store/tenantStore"

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { tenantId: string }
}) {
  const setTenant = useTenantStore((s) => s.set)

  useEffect(() => {
    setTenant(Number(params.tenantId))
    return () => setTenant(null)
  }, [params.tenantId, setTenant])

  return <>{children}</>
}
