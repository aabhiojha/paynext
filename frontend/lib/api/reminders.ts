import { api } from "@/lib/axios"
import { normalizePage } from "@/lib/utils"
import type { RawPage, ReminderResponse } from "@/types/api"

export const remindersApi = {
  list: (tenantId: number, page = 0, size = 20) =>
    api
      .get<RawPage<ReminderResponse>>(`/tenants/${tenantId}/reminders`, {
        params: { page, size },
      })
      .then((r) => normalizePage<ReminderResponse>(r.data)),

  get: (tenantId: number, reminderId: number) =>
    api
      .get<ReminderResponse>(`/tenants/${tenantId}/reminders/${reminderId}`)
      .then((r) => r.data),

  trigger: (tenantId: number) =>
    api
      .post<ReminderResponse[]>(`/tenants/${tenantId}/reminders/trigger`)
      .then((r) => r.data),
}
