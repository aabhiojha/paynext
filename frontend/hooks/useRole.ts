"use client"

import { useAuthStore } from "@/store/authStore"
import type { Role } from "@/types/api"

const LEVELS: Record<Role, number> = {
  TENANT_USER: 1,
  TENANT_ADMIN: 2,
  SUPER_ADMIN: 3,
}

export function useRole() {
  const role = useAuthStore((s) => s.user?.role)
  return {
    role,
    isSuperAdmin: role === "SUPER_ADMIN",
    isTenantAdmin: role === "TENANT_ADMIN",
    isTenantUser: role === "TENANT_USER",
    isAtLeast: (min: Role) => (role ? LEVELS[role] >= LEVELS[min] : false),
  }
}
