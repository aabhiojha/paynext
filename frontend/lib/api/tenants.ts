import { api } from "@/lib/axios"
import { normalizePage } from "@/lib/utils"
import type {
  CreateTenantRequest,
  Page,
  RawPage,
  TenantResponse,
} from "@/types/api"

export const tenantsApi = {
  list: (page = 0, size = 20) =>
    api
      .get<RawPage<TenantResponse>>("/tenants", { params: { page, size } })
      .then((r) => normalizePage<TenantResponse>(r.data)),

  get: (id: number) =>
    api.get<TenantResponse>(`/tenants/${id}`).then((r) => r.data),

  create: (data: CreateTenantRequest) =>
    api.post<TenantResponse>("/tenants", data).then((r) => r.data),

  update: (id: number, data: Partial<CreateTenantRequest>) =>
    api.patch<TenantResponse>(`/tenants/${id}`, data).then((r) => r.data),

  suspend: (id: number) =>
    api.post<TenantResponse>(`/tenants/${id}/suspend`).then((r) => r.data),

  archive: (id: number) =>
    api.post<TenantResponse>(`/tenants/${id}/archive`).then((r) => r.data),

  inviteAdmin: (id: number, email: string) =>
    api.post(`/tenants/${id}/invite-admin`, { email }).then((r) => r.data),
}

export type { Page }
