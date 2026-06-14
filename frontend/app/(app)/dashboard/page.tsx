"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { apiGet } from "@/lib/api";
import { titleCase } from "@/lib/format";
import ActivityIcon from "@/components/ActivityIcon";
import ResizeHandle from "@/components/ResizeHandle";
import { useColumnResize } from "@/lib/useColumnResize";
import TableSkeleton from "@/components/TableSkeleton";

function useCountUp(target: number, duration = 450) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

type TenantSummary = {
  totalCustomers: number;
  totalProducts: number;
  activePlans: number;
  pausedPlans: number;
  cancelledPlans: number;
};

type ApiUpcoming = {
  customerProductId: number;
  customerName: string;
  productName: string;
  currency: string;
  amount: number;
  endsAt: string;
};

type ReminderStats = {
  from: string;
  to: string;
  sent: number;
  failed: number;
  skipped: number;
  total: number;
};

type AuditLog = {
  id: number;
  actorEmail: string;
  actorName: string | null;
  action: string;
  resourceType: string;
  resourceId: number | null;
  target: string | null;
  createdAt: string;
};

type OverduePlan = {
  customerProductId: number;
  customerName: string;
  productName: string;
  currency: string;
  amount: number;
  endsAt: string;
};

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

// "<actor> <phrase> <target>", e.g. "Putin Prasad Oli paused the subscription for Layne Staley · Github"
const ACTIVITY_VERBS: Record<string, string> = {
  CREATED: "created", UPDATED: "updated", DELETED: "deleted",
  ACTIVATED: "activated", DEACTIVATED: "deactivated", PAUSED: "paused",
  CANCELLED: "cancelled", AUTO_CANCELLED: "auto-cancelled",
  SUSPENDED: "suspended", REACTIVATED: "reactivated", ARCHIVED: "archived",
  DISABLED: "disabled", REVOKED: "revoked", ACCEPTED: "accepted",
  ASSIGNED: "assigned",
};

const RESOURCE_NOUNS: Record<string, string> = {
  CUSTOMER: "customer", PRODUCT: "product", CUSTOMER_PRODUCT: "the subscription for",
  USER: "user", INVITATION: "the invitation for", TENANT: "tenant",
  PLATFORM_PLAN: "platform plan", TENANT_PLATFORM_PLAN: "platform plan",
};

function activityPhrase(log: AuditLog): string {
  if (log.action === "PASSWORD_RESET.REQUESTED") return "requested a password reset for";
  if (log.action === "PASSWORD_RESET.COMPLETED") return "completed a password reset for";
  if (log.action === "USER.ROLE_CHANGED") return "changed the role of";
  const suffix = log.action.includes(".") ? log.action.split(".").pop()! : log.action;
  const verb = ACTIVITY_VERBS[suffix] ?? suffix.toLowerCase().replace(/_/g, " ");
  const noun = RESOURCE_NOUNS[log.resourceType] ?? log.resourceType.toLowerCase().replace(/_/g, " ");
  return `${verb} ${noun}`;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  /** Accepted for call-site compatibility; entrance is handled by the page section reveal. */
  delay?: number;
}) {
  return (
    <div
      className="rounded-xl px-5 py-4 flex flex-col gap-1"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p
        className="text-2xl font-bold tabular-nums leading-tight"
        style={{ color: accent ?? "#111827" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10 text-gray-400">
      <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      Loading…
    </div>
  );
}

function RenewalTable({ rows, loading }: { rows: ApiUpcoming[]; loading: boolean }) {
  if (loading) return <TableSkeleton columns={4} rows={4} />;
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400 rounded-lg" style={{ border: "1px solid var(--border)" }}>
        No upcoming renewals this week.
      </div>
    );
  }
  const renewalCols = [160, 140, 130, 120];
  const { widths: renewalWidths, onMouseDown: onRenewalMouseDown } = useColumnResize(renewalCols);
  return (
    <div className="rounded-lg overflow-hidden overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
      <table style={{ tableLayout: "fixed", width: "100%", minWidth: renewalWidths.reduce((a, b) => a + b, 0) }}>
        <colgroup>
          {renewalWidths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
            {["Customer", "Plan", "Renewal Date", "Amount"].map((h, i) => (
              <th key={h} className="relative text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide overflow-hidden">
                <span className="truncate block pr-2">{h}</span>
                {i < 3 && <ResizeHandle onMouseDown={(e) => onRenewalMouseDown(i, e)} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.customerProductId}
              className="hover:bg-md-primary/5 transition-colors"
              style={{
                borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                animation: "fade-in 0.25s ease-out both",
              }}
            >
              <td className="px-4 py-2.5 text-sm font-medium text-gray-900 overflow-hidden truncate" title={row.customerName}>{row.customerName}</td>
              <td className="px-4 py-2.5 text-sm text-gray-600 overflow-hidden truncate" title={titleCase(row.productName)}>{titleCase(row.productName)}</td>
              <td className="px-4 py-2.5 text-sm text-gray-700 overflow-hidden truncate">{formatShortDate(row.endsAt)}</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 overflow-hidden truncate">
                {row.currency} {Number(row.amount).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReminderStatusPanel({ stats, loading }: { stats: ReminderStats | null; loading: boolean }) {
  const successRate =
    stats && stats.total > 0
      ? (((stats.sent) / stats.total) * 100).toFixed(1)
      : null;
  const rateNum = successRate ? parseFloat(successRate) : 100;
  const rateColor = rateNum >= 95 ? "#24A37D" : rateNum >= 80 ? "#f59e0b" : "#dc2626";
  const pending = stats ? stats.total - stats.sent - stats.failed - stats.skipped : 0;

  const rows = [
    { label: "Sent",    value: stats?.sent    ?? 0, color: "#24A37D", icon: "✓" },
    { label: "Pending", value: Math.max(0, pending), color: "#6366f1", icon: "◷" },
    { label: "Failed",  value: stats?.failed  ?? 0, color: "#dc2626", icon: "⚠" },
    { label: "Skipped", value: stats?.skipped ?? 0, color: "#9ca3af", icon: "⊘" },
  ];

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Reminder Status</p>
        {stats && (
          <span className="text-xs text-gray-400">Last 30 days</span>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: row.color }}>{row.icon}</span>
                  <span className="text-sm text-gray-600">{row.label}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums" style={{ color: row.color === "#9ca3af" ? "#6b7280" : row.color }}>
                  {row.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Success Rate</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: rateColor }}>
                {successRate ?? "—"}%
              </span>
            </div>
            <div className="w-full rounded-lg overflow-hidden" style={{ height: 5, backgroundColor: "#e5e7eb" }}>
              <div
                className="h-full rounded-lg transition-all duration-700"
                style={{ width: `${successRate ?? 0}%`, backgroundColor: rateColor }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RecentActivity({ logs, loading }: { logs: AuditLog[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400 rounded-lg" style={{ border: "1px solid var(--border)" }}>
        No recent activity.
      </div>
    );
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
        {logs.map((log, i) => (
          <div
            key={log.id}
            className="flex items-start gap-3 px-4 py-3 hover:bg-md-primary/5 transition-colors"
            style={{ animation: "fade-in 0.25s ease-out both",borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
          >
            <ActivityIcon action={log.action} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 leading-snug">
                <span className="font-medium">{log.actorName || log.actorEmail}</span>{" "}
                <span className="text-gray-500">{activityPhrase(log)}</span>
                {log.target && <span className="font-medium"> {log.target}</span>}
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5 tabular-nums">{relativeTime(log.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [upcoming, setUpcoming] = useState<ApiUpcoming[]>([]);
  const [reminderStats, setReminderStats] = useState<ReminderStats | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    if (!token || !user || user.role === "SUPER_ADMIN") return;
    const tid = user.tenantId;
    if (!tid) return;

    Promise.allSettled([
      apiGet<TenantSummary>(`/api/v1/tenants/${tid}/dashboard/summary`, token),
      apiGet<ApiUpcoming[]>(`/api/v1/tenants/${tid}/dashboard/upcoming-reminders`, token),
      apiGet<ReminderStats>(`/api/v1/tenants/${tid}/dashboard/reminders`, token),
      apiGet<AuditLog[]>(`/api/v1/tenants/${tid}/dashboard/recent-activity`, token),
      apiGet<OverduePlan[]>(`/api/v1/tenants/${tid}/dashboard/overdue`, token),
    ]).then(([sum, upcomingRes, statsRes, logsRes, overdueRes]) => {
      if (sum.status === "fulfilled") setSummary(sum.value);
      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
      if (statsRes.status === "fulfilled") setReminderStats(statsRes.value);
      if (logsRes.status === "fulfilled") setActivity(logsRes.value);
      if (overdueRes.status === "fulfilled") setOverdueCount(overdueRes.value.length);
    }).finally(() => setLoading(false));
  }, [token, user]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const customerVal = useCountUp(!loading && summary ? summary.totalCustomers : 0);
  const activeVal   = useCountUp(!loading && summary ? summary.activePlans : 0);
  const overdueVal  = useCountUp(!loading ? overdueCount : 0);

  return (
    <div className="font-sans px-6 py-8 md:px-10 md:py-10 max-w-6xl mx-auto space-y-8 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Customers"
          value={loading ? "—" : customerVal.toLocaleString()}
          sub={summary ? `${summary.totalProducts} products` : undefined}
          delay={0}
        />
        <StatCard
          label="Active Subscriptions"
          value={loading ? "—" : activeVal.toLocaleString()}
          sub={summary ? `${summary.pausedPlans} paused` : undefined}
          accent="#24A37D"
          delay={40}
        />
        <StatCard
          label="Overdue / Expired"
          value={loading ? "—" : overdueVal.toLocaleString()}
          sub={overdueCount > 0 ? "needs attention" : "all clear"}
          accent={overdueCount > 0 ? "#dc2626" : "#24A37D"}
          delay={80}
        />
      </div>

      {/* Middle row: Upcoming Renewals + Reminder Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Renewals */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Upcoming Renewals</h2>
              <p className="text-xs text-gray-500 mt-0.5">Subscriptions renewing this week</p>
            </div>
            {!loading && upcoming.length > 0 && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: "#fff3cd", color: "#92400e" }}
              >
                {upcoming.length} due
              </span>
            )}
          </div>
          <RenewalTable rows={upcoming} loading={loading} />
        </div>

        {/* Reminder Status */}
        <div className="lg:col-span-1">
          <div className="mb-3">
            <h2 className="text-base font-bold text-gray-900">Reminder Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">Delivery overview</p>
          </div>
          <ReminderStatusPanel stats={reminderStats} loading={loading} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
          <p className="text-xs text-gray-500 mt-0.5">Latest actions in your account</p>
        </div>
        <RecentActivity logs={activity} loading={loading} />
      </div>
    </div>
  );
}
