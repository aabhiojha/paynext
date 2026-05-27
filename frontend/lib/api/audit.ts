import { api } from "@/lib/axios"
import { normalizePage } from "@/lib/utils"
import type { AuditLogResponse, RawPage } from "@/types/api"

export interface AuditFilter {
  actorId?: number
  actorEmail?: string
  actions?: string[]
  resourceTypes?: string[]
  resourceId?: number
}

export const auditApi = {
  list: (page = 0, size = 50, filter: AuditFilter = {}) => {
    const params: Record<string, unknown> = { page, size }
    if (filter.actorId != null) params.actorId = filter.actorId
    if (filter.actorEmail) params.actorEmail = filter.actorEmail
    if (filter.actions?.length) params.actions = filter.actions.join(",")
    if (filter.resourceTypes?.length) params.resourceTypes = filter.resourceTypes.join(",")
    if (filter.resourceId != null) params.resourceId = filter.resourceId
    return api
      .get<RawPage<AuditLogResponse>>("/audit-logs", { params })
      .then((r) => normalizePage<AuditLogResponse>(r.data))
  },
}
