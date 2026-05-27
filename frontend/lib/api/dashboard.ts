import { api } from "@/lib/axios"
import type {
  TenantSummary,
  RevenueByCurrency,
  ReminderStats,
  UpcomingReminder,
  OverduePlan,
  AuditLogResponse,
  AdminSummary,
} from "@/types/api"

export const dashboardApi = {
  summary: (tenantId: number) =>
    api
      .get<TenantSummary>(`/tenants/${tenantId}/dashboard/summary`)
      .then((r) => r.data),

  revenue: (tenantId: number) =>
    api
      .get<RevenueByCurrency>(`/tenants/${tenantId}/dashboard/revenue`)
      .then((r) => r.data),

  reminderStats: (tenantId: number, from?: string, to?: string) =>
    api
      .get<ReminderStats>(`/tenants/${tenantId}/dashboard/reminders`, {
        params: { from, to },
      })
      .then((r) => r.data),

  upcomingReminders: (tenantId: number) =>
    api
      .get<UpcomingReminder[]>(
        `/tenants/${tenantId}/dashboard/upcoming-reminders`
      )
      .then((r) => r.data),

  overduePlans: (tenantId: number) =>
    api
      .get<OverduePlan[]>(`/tenants/${tenantId}/dashboard/overdue`)
      .then((r) => r.data),

  recentActivity: (tenantId: number) =>
    api
      .get<AuditLogResponse[]>(
        `/tenants/${tenantId}/dashboard/recent-activity`
      )
      .then((r) => r.data),

  adminSummary: () =>
    api
      .get<AdminSummary>("/admin/dashboard/summary")
      .then((r) => r.data),
}
