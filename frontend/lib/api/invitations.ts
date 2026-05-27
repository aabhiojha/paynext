import { api } from "@/lib/axios"
import { normalizePage } from "@/lib/utils"
import type { InvitationResponse, RawPage } from "@/types/api"

export const invitationsApi = {
  list: (tenantId: number, page = 0, size = 20) =>
    api
      .get<RawPage<InvitationResponse>>(`/tenants/${tenantId}/invitations`, {
        params: { page, size },
      })
      .then((r) => normalizePage<InvitationResponse>(r.data)),

  inviteUser: (tenantId: number, email: string) =>
    api
      .post<InvitationResponse>(`/tenants/${tenantId}/invite-user`, { email })
      .then((r) => r.data),

  inviteAdmin: (tenantId: number, email: string) =>
    api
      .post<InvitationResponse>(`/tenants/${tenantId}/invite-admin`, { email })
      .then((r) => r.data),

  revoke: (tenantId: number, id: number) =>
    api
      .post<InvitationResponse>(`/tenants/${tenantId}/invitations/${id}/revoke`)
      .then((r) => r.data),

  resend: (tenantId: number, id: number) =>
    api
      .post<InvitationResponse>(`/tenants/${tenantId}/invitations/${id}/resend`)
      .then((r) => r.data),
}
