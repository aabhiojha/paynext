import { api } from "@/lib/axios"
import { normalizePage } from "@/lib/utils"
import type { RawPage, UserResponse, Role } from "@/types/api"

export const usersApi = {
  list: (tenantId: number, page = 0, size = 20) =>
    api
      .get<RawPage<UserResponse>>(`/tenants/${tenantId}/users`, {
        params: { page, size },
      })
      .then((r) => normalizePage<UserResponse>(r.data)),

  get: (tenantId: number, userId: number) =>
    api
      .get<UserResponse>(`/tenants/${tenantId}/users/${userId}`)
      .then((r) => r.data),

  updateRole: (tenantId: number, userId: number, role: Role) =>
    api
      .patch<UserResponse>(`/tenants/${tenantId}/users/${userId}`, { role })
      .then((r) => r.data),

  disable: (tenantId: number, userId: number) =>
    api
      .post<UserResponse>(`/tenants/${tenantId}/users/${userId}/disable`)
      .then((r) => r.data),

  delete: (tenantId: number, userId: number) =>
    api.delete(`/tenants/${tenantId}/users/${userId}`).then((r) => r.data),
}
