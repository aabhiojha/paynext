"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiGet } from "@/lib/api";
import Pagination from "@/components/Pagination";
import {
  UserCreatedIcon, UserRoleChangedIcon, UserDisabledIcon, UserDeletedIcon,
  PasswordResetRequestedIcon, PasswordResetCompletedIcon,
  TenantCreatedIcon, TenantUpdatedIcon, TenantSuspendedIcon, TenantReactivatedIcon, TenantArchivedIcon,
  CustomerCreatedIcon, CustomerUpdatedIcon, CustomerDeletedIcon,
  ProductCreatedIcon, ProductUpdatedIcon, ProductDeletedIcon,
  SubscriptionCreatedIcon, SubscriptionUpdatedIcon, SubscriptionActivatedIcon, SubscriptionPausedIcon,
  SubscriptionCancelledIcon, SubscriptionAutoCancelledIcon, SubscriptionDeletedIcon,
  InvitationCreatedIcon, InvitationRevokedIcon, InvitationAcceptedIcon,
  PlatformPlanCreatedIcon, PlatformPlanUpdatedIcon, PlatformPlanArchivedIcon, TenantPlanAssignedIcon,
} from "@/components/Icons";

const PAGE_SIZE = 15;

type AuditLog = {
  id: number;
  actorId: number;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: number | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  userAgent: string | null;
  createdAt: string;
};

type Page<T> = { content: T[]; page: { totalElements: number; totalPages: number; size: number; number: number } };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTION_ICON: Record<string, (props?: any) => React.ReactNode> = {
  "USER.CREATED":              (p) => <UserCreatedIcon size={16} {...p} />,
  "USER.ROLE_CHANGED":         (p) => <UserRoleChangedIcon size={16} {...p} />,
  "USER.DISABLED":             (p) => <UserDisabledIcon size={16} {...p} />,
  "USER.DELETED":              (p) => <UserDeletedIcon size={16} {...p} />,
  "PASSWORD_RESET_REQUESTED":  (p) => <PasswordResetRequestedIcon size={16} {...p} />,
  "PASSWORD_RESET_COMPLETED":  (p) => <PasswordResetCompletedIcon size={16} {...p} />,
  "TENANT.CREATED":            (p) => <TenantCreatedIcon size={16} {...p} />,
  "TENANT.UPDATED":            (p) => <TenantUpdatedIcon size={16} {...p} />,
  "TENANT.SUSPENDED":          (p) => <TenantSuspendedIcon size={16} {...p} />,
  "TENANT.REACTIVATED":        (p) => <TenantReactivatedIcon size={16} {...p} />,
  "TENANT.ARCHIVED":           (p) => <TenantArchivedIcon size={16} {...p} />,
  "CUSTOMER.CREATED":          (p) => <CustomerCreatedIcon size={16} {...p} />,
  "CUSTOMER.UPDATED":          (p) => <CustomerUpdatedIcon size={16} {...p} />,
  "CUSTOMER.DELETED":          (p) => <CustomerDeletedIcon size={16} {...p} />,
  "PRODUCT.CREATED":           (p) => <ProductCreatedIcon size={16} {...p} />,
  "PRODUCT.UPDATED":           (p) => <ProductUpdatedIcon size={16} {...p} />,
  "PRODUCT.DELETED":           (p) => <ProductDeletedIcon size={16} {...p} />,
  "SUBSCRIPTION.CREATED":      (p) => <SubscriptionCreatedIcon size={16} {...p} />,
  "SUBSCRIPTION.UPDATED":      (p) => <SubscriptionUpdatedIcon size={16} {...p} />,
  "SUBSCRIPTION.ACTIVATED":    (p) => <SubscriptionActivatedIcon size={16} {...p} />,
  "SUBSCRIPTION.PAUSED":       (p) => <SubscriptionPausedIcon size={16} {...p} />,
  "SUBSCRIPTION.CANCELLED":    (p) => <SubscriptionCancelledIcon size={16} {...p} />,
  "SUBSCRIPTION.AUTO_CANCELLED": (p) => <SubscriptionAutoCancelledIcon size={16} {...p} />,
  "SUBSCRIPTION.DELETED":      (p) => <SubscriptionDeletedIcon size={16} {...p} />,
  "INVITATION.CREATED":        (p) => <InvitationCreatedIcon size={16} {...p} />,
  "INVITATION.REVOKED":        (p) => <InvitationRevokedIcon size={16} {...p} />,
  "INVITATION.ACCEPTED":       (p) => <InvitationAcceptedIcon size={16} {...p} />,
  "PLATFORM_PLAN.CREATED":     (p) => <PlatformPlanCreatedIcon size={16} {...p} />,
  "PLATFORM_PLAN.UPDATED":     (p) => <PlatformPlanUpdatedIcon size={16} {...p} />,
  "PLATFORM_PLAN.ARCHIVED":    (p) => <PlatformPlanArchivedIcon size={16} {...p} />,
  "TENANT_PLAN.ASSIGNED":      (p) => <TenantPlanAssignedIcon size={16} {...p} />,
};

type ActionCategory = {
  label: string;
  color: string;
  bg: string;
  actions: string[];
};

const ACTION_CATEGORIES: ActionCategory[] = [
  { label: "Created", color: "#166534", bg: "#dcfce7", actions: [
    "USER.CREATED", "CUSTOMER.CREATED", "PRODUCT.CREATED",
    "SUBSCRIPTION.CREATED", "TENANT.CREATED", "INVITATION.CREATED",
    "PLATFORM_PLAN.CREATED", "TENANT_PLAN.ASSIGNED",
  ]},
  { label: "Updated", color: "#1e40af", bg: "#dbeafe", actions: [
    "USER.ROLE_CHANGED", "CUSTOMER.UPDATED", "PRODUCT.UPDATED",
    "SUBSCRIPTION.UPDATED", "TENANT.UPDATED", "PLATFORM_PLAN.UPDATED",
  ]},
  { label: "Deleted", color: "#991b1b", bg: "#fee2e2", actions: [
    "USER.DELETED", "CUSTOMER.DELETED", "PRODUCT.DELETED", "SUBSCRIPTION.DELETED",
  ]},
  { label: "Status", color: "#854d0e", bg: "#fef9c3", actions: [
    "SUBSCRIPTION.ACTIVATED", "SUBSCRIPTION.PAUSED",
    "SUBSCRIPTION.CANCELLED", "SUBSCRIPTION.AUTO_CANCELLED",
    "TENANT.SUSPENDED", "TENANT.REACTIVATED", "TENANT.ARCHIVED",
    "USER.DISABLED", "INVITATION.REVOKED", "PLATFORM_PLAN.ARCHIVED",
  ]},
];

function categoryForAction(action: string): ActionCategory {
  return ACTION_CATEGORIES.find((c) => c.actions.includes(action)) ?? ACTION_CATEGORIES[0];
}

type DateBucket = "today" | "yesterday" | "this_week" | "this_month" | "older";

function dateBucket(iso: string): DateBucket {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  if (d >= today) return "today";
  if (d >= yesterday) return "yesterday";
  if (d >= startOfWeek) return "this_week";
  if (d >= startOfMonth) return "this_month";
  return "older";
}

function bucketLabel(bucket: DateBucket): string {
  switch (bucket) {
    case "today": return "Today";
    case "yesterday": return "Yesterday";
    case "this_week": return "This week";
    case "this_month": return "This month";
    case "older": return "Earlier";
  }
}

type Grouped = { bucket: DateBucket; label: string; logs: AuditLog[] };

function groupLogs(logs: AuditLog[]): Grouped[] {
  const groups = new Map<DateBucket, AuditLog[]>();
  for (const log of logs) {
    const bucket = dateBucket(log.createdAt);
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket)!.push(log);
  }
  const order: DateBucket[] = ["today", "yesterday", "this_week", "this_month", "older"];
  return order.filter((b) => groups.has(b)).map((bucket) => ({ bucket, label: bucketLabel(bucket), logs: groups.get(bucket)! }));
}

export default function AuditLogPage() {
  const token = useAuthStore((s) => s.token);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string[]>([]);
  const [resourceFilter, setResourceFilter] = useState("");
  const [detailsOpen, setDetailsOpen] = useState<Set<number>>(new Set());

  const HIDE_ACTIONS = new Set(["USER.LOGIN", "USER.LOGOUT", "USER.LOGIN_FAILED"]);

  const load = (p = page, actions = actionFilter, resource = resourceFilter) => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(p), sort: "createdAt,desc" });
    if (actions.length > 0) params.set("actions", actions.join(","));
    if (resource.trim()) params.set("resourceTypes", resource.trim().toUpperCase().replace(/ /g, "_"));
    apiGet<Page<AuditLog>>(`/api/v1/audit-logs/tenant?${params}`, token)
      .then((d) => {
        const filtered = d.content.filter((l) => !HIDE_ACTIONS.has(l.action));
        setLogs(filtered);
        setTotal(d.page.totalElements - (d.content.length - filtered.length));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(0); load(0, actionFilter, resourceFilter); }, [token]);

  const grouped = useMemo(() => groupLogs(logs), [logs]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeCount = actionFilter.length;

  function toggleFilter(cat: ActionCategory) {
    const next = actionFilter.some((a) => cat.actions.includes(a))
      ? actionFilter.filter((x) => !cat.actions.includes(x))
      : [...actionFilter, ...cat.actions];
    setActionFilter(next);
    setPage(0);
    load(0, next, resourceFilter);
  }

  function clearFilters() {
    setActionFilter([]);
    setPage(0);
    load(0, [], resourceFilter);
  }

  function toggleDetails(id: number) {
    setDetailsOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="px-6 py-8 md:px-10 max-w-5xl mx-auto space-y-6 min-h-full flex flex-col" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} event{total !== 1 ? "s" : ""} recorded
            {activeCount > 0 && <span className="text-gray-400"> · {activeCount} filter{activeCount !== 1 ? "s" : ""} active</span>}
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {ACTION_CATEGORIES.map((cat) => {
          const active = cat.actions.some((a) => actionFilter.includes(a));
          return (
            <button
              key={cat.label}
              onClick={() => toggleFilter(cat)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={active ? { backgroundColor: cat.bg, color: cat.color } : { border: "1px solid var(--border)", color: "#9ca3af" }}
            >
              <span className="rounded-full" style={{ width: 7, height: 7, backgroundColor: cat.color }} />
              {cat.label}
            </button>
          );
        })}
        {activeCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs font-semibold px-3 py-1.5 rounded-full text-gray-400 hover:text-gray-600"
            style={{ border: "1px solid var(--border)" }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Log list */}
      <div className="flex-1 min-h-0 flex flex-col">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="animate-spin mr-2.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          Loading events…
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-sm text-gray-400 rounded-xl" style={{ border: "1px solid var(--border)" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
          {activeCount > 0 ? "No events match the selected filters." : "No events recorded yet."}
        </div>
      ) : (
        <div className="space-y-8 overflow-auto flex-1 min-h-0">
          {grouped.map((group) => (
            <section key={group.bucket}>
              <h2 className="text-sm font-bold text-gray-500 mb-3 sticky top-0 z-20 py-1" style={{ backgroundColor: "var(--bg-app)" }}>{group.label}</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <table className="w-full text-sm">
                  <thead className="sticky z-10" style={{ top: "1.75rem" }}>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-full" style={{ backgroundColor: "#f9fafb" }}>Event</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap" style={{ backgroundColor: "#f9fafb" }}>By</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap" style={{ backgroundColor: "#f9fafb" }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.logs.map((log) => {
                      const Icon = ACTION_ICON[log.action];
                      const hasDetails = log.oldValue || log.newValue;
                      const showDetails = detailsOpen.has(log.id);
                      return (
                        <tr key={log.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2.5">
                              <span className="flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }}>
                                {Icon ? <Icon /> : null}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm text-gray-800 leading-snug">
                                  {log.description ?? (
                                    <><span className="font-medium">{log.actorEmail}</span><span className="text-gray-400"> · </span><span className="text-gray-500">{log.resourceType.toLowerCase().replace(/_/g, " ")}</span></>
                                  )}
                                </p>
                                {hasDetails && (
                                  <div className="mt-1">
                                    <button
                                      onClick={() => toggleDetails(log.id)}
                                      className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors flex items-center gap-1"
                                    >
                                      <svg
                                        width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                        style={{ transform: showDetails ? "rotate(90deg)" : undefined, transition: "transform 0.12s" }}
                                      >
                                        <path d="m9 18 6-6-6-6" />
                                      </svg>
                                      {showDetails ? "Hide technical details" : "Show technical details"}
                                    </button>
                                    {showDetails && (
                                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {log.oldValue && (
                                          <div className="rounded-lg p-2.5 text-xs font-mono break-all" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
                                            <p className="font-semibold mb-1 font-sans text-[11px] text-red-400 uppercase tracking-wide">Previous state</p>
                                            <pre className="whitespace-pre-wrap">{(() => { try { return JSON.stringify(JSON.parse(log.oldValue!), null, 2); } catch { return log.oldValue; } })()}</pre>
                                          </div>
                                        )}
                                        {log.newValue && (
                                          <div className="rounded-lg p-2.5 text-xs font-mono break-all" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
                                            <p className="font-semibold mb-1 font-sans text-[11px] text-green-400 uppercase tracking-wide">New state</p>
                                            <pre className="whitespace-pre-wrap">{(() => { try { return JSON.stringify(JSON.parse(log.newValue!), null, 2); } catch { return log.newValue; } })()}</pre>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap align-top">{log.actorEmail}</td>
                          <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap align-top" title={formatDateTime(log.createdAt)}>{relativeTime(log.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalElements={total}
        pageSize={PAGE_SIZE}
        onChange={(p) => { setPage(p); load(p); }}
      />
    </div>
  );
}
