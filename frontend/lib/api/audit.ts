import { api } from "@/lib/axios"
import { normalizePage } from "@/lib/utils"
import type { AuditLogResponse, RawPage } from "@/types/api"

export interface AuditFilter {
  actorId?: number
  action?:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "STATUS_CHANGE"
    | "LOGIN"
    | "LOGOUT"
    | "LOGIN_FAILED"
  resourceType?: string
  resourceId?: number
}

export const auditApi = {
  list: (page = 0, size = 50, filter: AuditFilter = {}) =>
    api
      .get<RawPage<AuditLogResponse>>("/audit-logs", {
        params: { page, size, ...filter },
      })
      .then((r) => normalizePage<AuditLogResponse>(r.data)),
}
