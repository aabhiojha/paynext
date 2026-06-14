"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPost } from "@/lib/api";
import { titleCase } from "@/lib/format";
import Pagination from "@/components/Pagination";
import { useColumnResize } from "@/lib/useColumnResize";
import ResizeHandle from "@/components/ResizeHandle";
import TableSkeleton from "@/components/TableSkeleton";

const PAGE_SIZE = 15;

type Reminder = {
  id: number;
  customerName: string;
  productName: string;
  status: string;
  daysBeforeExpiry: number | null;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type UpcomingReminder = {
  customerProductId: number;
  customerId: number;
  customerName: string;
  productId: number;
  productName: string;
  planName: string | null;
  amount: string;
  endsAt: string;
  daysBeforeExpiry: number;
  reminderDate: string;
};

type Page<T> = { content: T[]; page: { totalElements: number; totalPages: number; size: number; number: number } };

const STATUS_FILTERS = ["ALL", "SENT", "PENDING", "FAILED", "SKIPPED"] as const;

function statusStyle(s: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    SENT:    { bg: "#dcfce7", color: "#166534" },
    PENDING: { bg: "#dbeafe", color: "#1e40af" },
    FAILED:  { bg: "#fee2e2", color: "#991b1b" },
    SKIPPED: { bg: "#f3f4f6", color: "#374151" },
  };
  return map[s] ?? { bg: "#f3f4f6", color: "#374151" };
}

function Badge({ status }: { status: string }) {
  const s = statusStyle(status);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold" style={s}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function MilestoneBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-gray-400">—</span>;
  const map: Record<number, { bg: string; color: string; label: string }> = {
    7:  { bg: "#386AF5", color: "#fff", label: "7-day" },
    3:  { bg: "#EF5F00", color: "#fff", label: "3-day" },
    1:  { bg: "#e8a020", color: "#000", label: "1-day" },
    0:  { bg: "#1f2937", color: "#fff", label: "Expiry" },
  };
  const s = map[days] ?? { bg: "#6b7280", color: "#fff", label: `${days}d` };
  return (
    <span className="inline-flex items-center justify-center w-12 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ReminderEnginePage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAdmin = user?.role === "TENANT_ADMIN";

  const [rows, setRows] = useState<Reminder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [upcoming, setUpcoming] = useState<UpcomingReminder[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");

  const tid = user?.tenantId;

  const upcomingCols = [150, 150, 130, 100, 100, 130, 130];
  const { widths: upcomingWidths, onMouseDown: onUpcomingMouseDown } = useColumnResize(upcomingCols);
  const historyCols = [160, 160, 110, 110, 150, 200];
  const { widths: historyWidths, onMouseDown: onHistoryMouseDown } = useColumnResize(historyCols);

  const load = (f = filter, p = page) => {
    if (!token || !tid) return;
    setLoading(true);
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(p), sort: "createdAt,desc" });
    if (f !== "ALL") params.set("status", f);
    apiGet<Page<Reminder>>(`/api/v1/tenants/${tid}/reminders?${params}`, token)
      .then((d) => { setRows(d.content); setTotal(d.page.totalElements); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadUpcoming = () => {
    if (!token || !tid) return;
    setUpcomingLoading(true);
    apiGet<UpcomingReminder[]>(`/api/v1/tenants/${tid}/reminders/upcoming?days=7`, token)
      .then(setUpcoming)
      .catch(() => {})
      .finally(() => setUpcomingLoading(false));
  };

  useEffect(() => { setPage(0); load(filter, 0); loadUpcoming(); }, [token, user]);

  const handleFilter = (f: string) => { setFilter(f); setPage(0); load(f, 0); };

  const triggerReminders = async () => {
    if (!token || !tid) return;
    setTriggering(true);
    setTriggerResult(null);
    try {
      await apiPost(`/api/v1/tenants/${tid}/reminders/trigger`, {}, token);
      setTriggerResult({ ok: true, msg: "Reminders triggered successfully. Check the list for new entries." });
      load();
      loadUpcoming();
    } catch (e) {
      setTriggerResult({ ok: false, msg: e instanceof Error ? e.message : "Failed to trigger reminders." });
    } finally {
      setTriggering(false);
    }
  };

  // Derived stats from current page (approximate)
  const sent    = rows.filter((r) => r.status === "SENT").length;
  const failed  = rows.filter((r) => r.status === "FAILED").length;
  const pending = rows.filter((r) => r.status === "PENDING").length;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-6 py-8 md:px-10 max-w-6xl mx-auto space-y-6 min-h-full flex flex-col page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminder Engine</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} reminders logged</p>
        </div>

        {isAdmin && (
          <div className="flex flex-col items-start sm:items-end gap-2">
            <button
              onClick={triggerReminders}
              disabled={triggering}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white active:scale-95 disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {triggering ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3l14 9-14 9V3z" />
                </svg>
              )}
              {triggering ? "Running…" : "Run Now"}
            </button>
            {triggerResult && (
              <p className="text-xs" style={{ color: triggerResult.ok ? "#166534" : "#991b1b" }}>
                {triggerResult.msg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b" style={{ borderColor: "var(--border)" }}>
        {([
          { key: "upcoming", label: "Upcoming Reminders" },
          { key: "history",  label: "Reminder History" },
        ] as const).map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="relative -mb-px pb-3 pt-1 text-sm font-semibold transition-colors"
              style={{ color: active ? "var(--primary)" : "#6b7280" }}
            >
              {t.label}
              <span
                className="absolute left-0 right-0 bottom-0 h-0.5 rounded-full transition-opacity"
                style={{ backgroundColor: "var(--primary)", opacity: active ? 1 : 0 }}
              />
            </button>
          );
        })}
      </div>

      {/* ── Upcoming tab ─────────────────────────────────────────────────── */}
      {activeTab === "upcoming" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Due to go out in the next 7 days, not yet sent</p>

          <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
            {upcomingLoading ? (
              <TableSkeleton columns={7} rows={4} bordered={false} />
            ) : upcoming.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                No reminders due in the next 7 days.
              </div>
            ) : (
              <table style={{ tableLayout: "fixed", width: "100%", minWidth: upcomingWidths.reduce((a, b) => a + b, 0) }}>
                <colgroup>{upcomingWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-card)" }}>
                    {["Customer", "Product", "Plan", "Amount", "Milestone", "Reminder Date", "Expires"].map((h, i) => (
                      <th key={i} className="relative text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide overflow-hidden">
                        <span className="truncate block pr-2">{h}</span>
                        {i < 6 && <ResizeHandle onMouseDown={(e) => onUpcomingMouseDown(i, e)} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((row) => (
                    <tr
                      key={`${row.customerProductId}-${row.daysBeforeExpiry}`}
                      className="hover:bg-md-primary/5 transition-colors"
                      style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--bg-app)", animation: "fade-in 0.25s ease-out both" }}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate overflow-hidden" title={row.customerName}>{row.customerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate overflow-hidden" title={titleCase(row.productName)}>{titleCase(row.productName)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 truncate overflow-hidden" title={row.planName ? titleCase(row.planName) : undefined}>{row.planName ? titleCase(row.planName) : "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap truncate overflow-hidden">{row.amount}</td>
                      <td className="px-4 py-3 overflow-hidden"><MilestoneBadge days={row.daysBeforeExpiry} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap truncate overflow-hidden">{formatDate(row.reminderDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap truncate overflow-hidden">{formatDate(row.endsAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── History tab ──────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <>
          {/* Mini stat strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Sent",    value: sent,    color: "#24A37D" },
              { label: "Failed",  value: failed,  color: "#dc2626" },
              { label: "Pending", value: pending, color: "#6366f1" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <span className="text-xs font-medium text-gray-500">{s.label}</span>
                <span className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: "var(--border)" }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => handleFilter(f)}
                className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all"
                style={
                  filter === f
                    ? { backgroundColor: "var(--primary)", color: "#fff" }
                    : { color: "#6b7280" }
                }
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: "1px solid var(--border)" }}>
            <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="text-base font-bold text-gray-900">Reminder History</h2>
              <p className="text-xs text-gray-500 mt-0.5">Past reminders that have been sent</p>
            </div>
            {loading ? (
              <TableSkeleton columns={6} bordered={false} />
            ) : rows.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                No reminders found.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table style={{ tableLayout: "fixed", width: "100%", minWidth: historyWidths.reduce((a, b) => a + b, 0) }}>
                <colgroup>{historyWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                <thead className="sticky top-0 z-10">
                  <tr>
                    {["Customer", "Product", "Milestone", "Status", "Sent At", ""].map((h, i) => (
                      <th key={i} className="relative text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide overflow-hidden" style={{ backgroundColor: "var(--bg-card)" }}>
                        <span className="truncate block pr-2">{h}</span>
                        {i < 5 && <ResizeHandle onMouseDown={(e) => onHistoryMouseDown(i, e)} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-md-primary/5 transition-colors"
                      style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--bg-app)", animation: "fade-in 0.25s ease-out both" }}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate overflow-hidden" title={row.customerName}>{row.customerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate overflow-hidden" title={titleCase(row.productName)}>{titleCase(row.productName)}</td>
                      <td className="px-4 py-3 overflow-hidden"><MilestoneBadge days={row.daysBeforeExpiry} /></td>
                      <td className="px-4 py-3 overflow-hidden"><Badge status={row.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap truncate overflow-hidden">
                        {row.sentAt ? formatDateTime(row.sentAt) : "—"}
                      </td>
                      <td className="px-4 py-3 overflow-hidden">
                        {row.errorMessage && (
                          <span className="text-xs text-red-500 truncate block" title={row.errorMessage}>
                            {row.errorMessage}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={total}
            pageSize={PAGE_SIZE}
            onChange={(p) => { setPage(p); load(filter, p); }}
          />
        </>
      )}
    </div>
  );
}
