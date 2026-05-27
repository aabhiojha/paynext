"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { MobileNav } from "@/components/layout/MobileNav"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/lib/api/auth"
import type { Role } from "@/types/api"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const setAuth = useAuthStore((s) => s.setAuth)

  // The login response omits tenantId, so we resolve it via /me whenever we're
  // authenticated but missing tenant context. SUPER_ADMIN legitimately has no
  // tenant, so skip them. The axios interceptor handles token refresh if
  // accessToken was lost on reload.
  const needsHydration =
    !!user && user.role !== "SUPER_ADMIN" && user.tenantId == null

  useQuery({
    queryKey: ["me", user?.userId],
    queryFn: async () => {
      const me = await authApi.me()
      const token = useAuthStore.getState().accessToken
      if (token && user) {
        setAuth(token, {
          userId: me.id,
          email: me.email,
          role: (me.role as Role) ?? user.role,
          tenantId: me.tenantId ?? null,
        })
      }
      return me
    },
    enabled: needsHydration,
    staleTime: 60_000,
    retry: 0,
  })

  useEffect(() => {
    const hasHint =
      typeof document !== "undefined" &&
      document.cookie.includes("session_hint")
    if (!hasHint && !user) {
      router.replace("/login")
    }
  }, [user, router])

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <TopBar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
