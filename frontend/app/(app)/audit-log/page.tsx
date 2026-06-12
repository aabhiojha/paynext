"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiGet } from "@/lib/api";
import Pagination from "@/components/Pagination";
import ActivityIcon from "@/components/ActivityIcon";

const PAGE_SIZE = 20;

type AuditLog = {
  id: number;
  actorId: number;
  actorEmail: string;
  actorName: string | null;
  tenantName: string | null;
  action: string;
  resourceType: string;
  resourceId: number | null;
  target: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  userAgent: string | null;
  createdAt: string;
};

type Page<T> = { content: T[]; page: { totalElements: number; totalPages: number; size: number; number: number } };

const HIDE_ACTIONS = new Set(["USER.LOGIN", "USER.LOGOUT", "USER.LOGIN_FAILED"]);

/* ── Labels ──────────────────────────────────────────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
  "USER.CREATED": "Create user",
  "USER.ROLE_CHANGED": "Change user role",
  "USER.DISABLED": "Disable user",
  "USER.DELETED": "Delete user",
  "PASSWORD_RESET.REQUESTED": "Request password reset",
  "PASSWORD_RESET.COMPLETED": "Complete password reset",
  "TENANT.CREATED": "Create tenant",
  "TENANT.UPDATED": "Update tenant",
  "TENANT.SUSPENDED": "Suspend tenant",
  "TENANT.REACTIVATED": "Reactivate tenant",
  "TENANT.ARCHIVED": "Archive tenant",
  "CUSTOMER.CREATED": "Create customer",
  "CUSTOMER.UPDATED": "Update customer",
  "CUSTOMER.DELETED": "Delete customer",
  "PRODUCT.CREATED": "Create product",
  "PRODUCT.UPDATED": "Update product",
  "PRODUCT.DELETED": "Delete product",
  "PRODUCT.ACTIVATED": "Activate product",
  "PRODUCT.DEACTIVATED": "Deactivate product",
  "SUBSCRIPTION.CREATED": "Create subscription",
  "SUBSCRIPTION.UPDATED": "Update subscription",
  "SUBSCRIPTION.ACTIVATED": "Activate subscription",
  "SUBSCRIPTION.PAUSED": "Pause subscription",
  "SUBSCRIPTION.CANCELLED": "Cancel subscription",
  "SUBSCRIPTION.AUTO_CANCELLED": "Auto-cancel subscription",
  "SUBSCRIPTION.DELETED": "Delete subscription",
  "INVITATION.CREATED": "Create invitation",
  "INVITATION.REVOKED": "Revoke invitation",
  "INVITATION.ACCEPTED": "Accept invitation",
  "PLATFORM_PLAN.CREATED": "Create platform plan",
  "PLATFORM_PLAN.UPDATED": "Update platform plan",
  "PLATFORM_PLAN.ARCHIVED": "Archive platform plan",
  "TENANT_PLAN.ASSIGNED": "Assign platform plan",
};

const RESOURCE_TYPES: { value: string; label: string }[] = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "PRODUCT", label: "Product" },
  { value: "CUSTOMER_PRODUCT", label: "Subscription" },
  { value: "USER", label: "User" },
  { value: "INVITATION", label: "Invitation" },
  { value: "TENANT", label: "Tenant" },
  { value: "PLATFORM_PLAN", label: "Platform plan" },
  { value: "TENANT_PLATFORM_PLAN", label: "Tenant plan" },
];

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.toLowerCase().replace(/[._]/g, " ");
}

/** Derive the human target ("who/what it happened to") from the description. */
const TARGET_RULES: { re: RegExp; group: number }[] = [
  { re: /^Changed role of (\S+) /, group: 1 },
  { re: /^Invited (\S+) /, group: 1 },
  { re: /^\S+ (?:subscription for|invitation for|platform plan|customer|product|user|tenant) (.+)$/i, group: 1 },
];

function targetOf(log: AuditLog): string {
  if (log.target) return log.target;
  for (const rule of TARGET_RULES) {
    const m = log.description?.match(rule.re);
    if (m) return m[rule.group];
  }
  const type = log.resourceType.toLowerCase().replace(/_/g, " ");
  return log.resourceId != null ? `${type} #${log.resourceId}` : type;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  let h = d.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${date} ${String(h).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}${ampm}`;
}

function formatDateShort(ymd: string): string {
  return ymd.replace(/-/g, "/");
}

/* ── Field-level change view ─────────────────────────────────────────────── */

// Internal/machine fields that mean nothing to an end user: bookkeeping
// timestamps and all database ids/foreign keys. Rows whose snapshot contains
// nothing else (e.g. legacy logs that stored only ids) get no expander.
const HIDDEN_FIELDS = new Set(["id", "tenantId", "createdAt", "updatedAt"]);

function cleanSnapshot(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cleanSnapshot);
  if (value === null || typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (HIDDEN_FIELDS.has(k) || k.endsWith("Id")) continue;
    out[k] = cleanSnapshot(v);
  }
  return out;
}

function humanizeKey(path: string): string {
  const words = path
    .split(".")
    .map((seg) => seg.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase())
    .join(" · ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return formatTimestamp(v);
    if (/^[A-Z]{2,3}$/.test(v)) return v; // currency codes etc.
    if (/^[A-Z][A-Z0-9_]*$/.test(v) && v.length > 1) {
      const t = v.toLowerCase().replace(/_/g, " ");
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    return v;
  }
  return String(v);
}

/** Flatten nested objects to dot paths; arrays become a comma-joined string. */
function flatten(value: unknown, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  if (Array.isArray(value)) {
    out[prefix] = value.map((x) => (typeof x === "object" && x !== null ? JSON.stringify(x) : x)).join(", ");
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out[prefix] = value;
  }
  return out;
}

function parseSnapshot(raw: string | null): Record<string, unknown> | string | null {
  if (!raw) return null;
  try {
    return flatten(cleanSnapshot(JSON.parse(raw)));
  } catch {
    return raw; // not JSON — show verbatim
  }
}

type FieldChange = { label: string; from?: string; to?: string; kind: "added" | "removed" | "changed" };

function computeChanges(oldRaw: string | null, newRaw: string | null): FieldChange[] | string {
  const before = parseSnapshot(oldRaw);
  const after = parseSnapshot(newRaw);
  if (typeof before === "string" || typeof after === "string") {
    return [before, after].filter((s) => typeof s === "string").join("\n");
  }
  const changes: FieldChange[] = [];
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  for (const key of keys) {
    const b = before?.[key];
    const a = after?.[key];
    if (before && after) {
      if ((b ?? null) !== (a ?? null)) changes.push({ label: humanizeKey(key), from: formatValue(b), to: formatValue(a), kind: "changed" });
    } else if (after) {
      changes.push({ label: humanizeKey(key), to: formatValue(a), kind: "added" });
    } else {
      changes.push({ label: humanizeKey(key), from: formatValue(b), kind: "removed" });
    }
  }
  return changes;
}

function hasVisibleChanges(log: AuditLog): boolean {
  if (!log.oldValue && !log.newValue) return false;
  const changes = computeChanges(log.oldValue, log.newValue);
  return typeof changes === "string" ? changes.trim().length > 0 : changes.length > 0;
}

const REMOVED_CHIP = { backgroundColor: "#fee2e2", color: "#991b1b" };
const ADDED_CHIP = { backgroundColor: "#dcfce7", color: "#166534" };

function ChangeDetails({ log }: { log: AuditLog }) {
  const changes = useMemo(() => computeChanges(log.oldValue, log.newValue), [log.oldValue, log.newValue]);

  if (typeof changes === "string") {
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap break-all rounded-lg px-4 py-3" style={{ border: "1px solid var(--border)", backgroundColor: "var(--color-md-surface)", color: "var(--color-gray-700)" }}>
        {changes}
      </pre>
    );
  }
  if (changes.length === 0) {
    return <p className="text-sm text-gray-400 px-1">No user-visible changes.</p>;
  }
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)", backgroundColor: "var(--color-md-surface)" }}>
      <table className="text-sm w-full">
        <tbody>
          {changes.map((c, i) => (
            <tr key={c.label} style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}>
              <td className="px-4 py-2 text-gray-500 whitespace-nowrap align-top" style={{ width: 200 }}>{c.label}</td>
              <td className="px-4 py-2 text-gray-800">
                {c.kind === "changed" && (
                  <span className="inline-flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded" style={REMOVED_CHIP}>{c.from}</span>
                    <span className="text-gray-400">→</span>
                    <span className="px-1.5 py-0.5 rounded" style={ADDED_CHIP}>{c.to}</span>
                  </span>
                )}
                {c.kind === "added" && <span className="px-1.5 py-0.5 rounded" style={ADDED_CHIP}>{c.to}</span>}
                {c.kind === "removed" && <span className="px-1.5 py-0.5 rounded line-through" style={REMOVED_CHIP}>{c.from}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Filter pill dropdown ────────────────────────────────────────────────── */

function FilterPill({ label, active, children }: { label: string; active: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, []);

  return (
    <div ref={container} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        style={{
          border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
          color: active ? "var(--primary)" : "var(--color-gray-700)",
          backgroundColor: active ? "var(--color-nav-active)" : "transparent",
        }}
      >
        {label}
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.12s" }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute z-30 left-0 mt-2 rounded-2xl py-2 min-w-[230px]"
          style={{ backgroundColor: "var(--bg-app)", boxShadow: "0 8px 24px rgba(28,27,31,0.14)" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function CheckItem({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors hover:bg-md-primary/10">
      <span
        className="flex items-center justify-center rounded flex-shrink-0"
        style={{
          width: 16, height: 16,
          border: `1.5px solid ${checked ? "var(--primary)" : "var(--color-md-outline)"}`,
          backgroundColor: checked ? "var(--primary)" : "transparent",
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="text-gray-800">{label}</span>
    </button>
  );
}

/* ── Timeframe ───────────────────────────────────────────────────────────── */

type Timeframe = { from: string | null; to: string | null }; // YYYY-MM-DD, local

function todayYmd(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TIMEFRAME_PRESETS: { label: string; make: () => Timeframe }[] = [
  { label: "Today", make: () => ({ from: todayYmd(), to: todayYmd() }) },
  { label: "Last 7 days", make: () => ({ from: todayYmd(-6), to: todayYmd() }) },
  { label: "Last 30 days", make: () => ({ from: todayYmd(-29), to: todayYmd() }) },
  { label: "All time", make: () => ({ from: null, to: null }) },
];

function timeframeLabel(tf: Timeframe): string {
  if (!tf.from && !tf.to) return "Timeframe: All time";
  if (tf.from && tf.to && tf.from === tf.to) return `Timeframe: ${formatDateShort(tf.from)}`;
  return `Timeframe: ${tf.from ? formatDateShort(tf.from) : "…"} – ${tf.to ? formatDateShort(tf.to) : "…"}`;
}

/* ── Page ────────────────────────────────────────────────────────────────── */

type Filters = {
  timeframe: Timeframe;
  actions: string[];
  actor: string;
  targets: string[];
};

const EMPTY_FILTERS: Filters = { timeframe: { from: null, to: null }, actions: [], actor: "", targets: [] };

export default function AuditLogPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [actorQuery, setActorQuery] = useState("");

  // setLoading(true) happens in the event handlers (filter/page changes), not
  // here — react-hooks/set-state-in-effect forbids synchronous setState in effects.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const f = filters;
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(page), sort: "createdAt,desc" });
    if (f.actions.length > 0) params.set("actions", f.actions.join(","));
    if (f.targets.length > 0) params.set("resourceTypes", f.targets.join(","));
    if (f.actor.trim()) params.set("actorEmail", f.actor.trim());
    if (f.timeframe.from) params.set("from", new Date(`${f.timeframe.from}T00:00:00`).toISOString());
    if (f.timeframe.to) params.set("to", new Date(`${f.timeframe.to}T23:59:59.999`).toISOString());
    const endpoint = isSuperAdmin ? "/api/v1/audit-logs" : "/api/v1/audit-logs/tenant";
    apiGet<Page<AuditLog>>(`${endpoint}?${params}`, token)
      .then((d) => {
        if (cancelled) return;
        const filtered = d.content.filter((l) => !HIDE_ACTIONS.has(l.action));
        setLogs(filtered);
        setTotal(d.page.totalElements - (d.content.length - filtered.length));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, isSuperAdmin, page, filters]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const { timeframe, actions: actionFilter, actor: actorFilter, targets: targetFilter } = filters;
  const hasFilters = actionFilter.length > 0 || targetFilter.length > 0 || !!actorFilter || !!timeframe.from || !!timeframe.to;

  const actionOptions = useMemo(
    () => Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
    []
  );

  function applyFilters(partial: Partial<Filters>) {
    setFilters({ ...filters, ...partial });
    setPage(0);
    setExpanded(new Set());
    setLoading(true);
  }
  const applyTimeframe = (timeframe: Timeframe) => applyFilters({ timeframe });
  const applyActions = (actions: string[]) => applyFilters({ actions });
  const applyActor = (actor: string) => applyFilters({ actor });
  const applyTargets = (targets: string[]) => applyFilters({ targets });

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const thCls = "text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap";

  return (
    <div className="px-6 py-8 md:px-10 max-w-6xl mx-auto space-y-5 min-h-full flex flex-col" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit log</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} event{total !== 1 ? "s" : ""} recorded</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <FilterPill label={timeframeLabel(timeframe)} active={!!timeframe.from || !!timeframe.to}>
          {TIMEFRAME_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyTimeframe(p.make())}
              className="w-full text-left px-4 py-2 text-sm text-gray-800 transition-colors hover:bg-md-primary/10"
            >
              {p.label}
            </button>
          ))}
          <div className="px-4 pt-2 pb-1 mt-1 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Custom range</p>
            <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
              From
              <input
                type="date"
                value={timeframe.from ?? ""}
                max={timeframe.to ?? undefined}
                onChange={(e) => applyTimeframe({ ...timeframe, from: e.target.value || null })}
                className="text-sm px-2 py-1 rounded-lg outline-none"
                style={{ border: "1px solid var(--border)" }}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
              To
              <input
                type="date"
                value={timeframe.to ?? ""}
                min={timeframe.from ?? undefined}
                onChange={(e) => applyTimeframe({ ...timeframe, to: e.target.value || null })}
                className="text-sm px-2 py-1 rounded-lg outline-none"
                style={{ border: "1px solid var(--border)" }}
              />
            </label>
          </div>
        </FilterPill>

        <FilterPill label={actionFilter.length > 0 ? `Action (${actionFilter.length})` : "Action"} active={actionFilter.length > 0}>
          <div className="max-h-72 overflow-y-auto">
            {actionOptions.map((opt) => (
              <CheckItem
                key={opt.value}
                label={opt.label}
                checked={actionFilter.includes(opt.value)}
                onToggle={() =>
                  applyActions(
                    actionFilter.includes(opt.value)
                      ? actionFilter.filter((a) => a !== opt.value)
                      : [...actionFilter, opt.value]
                  )
                }
              />
            ))}
          </div>
          {actionFilter.length > 0 && (
            <button
              onClick={() => applyActions([])}
              className="w-full text-left px-4 py-2 mt-1 text-sm font-medium transition-colors hover:bg-md-primary/10"
              style={{ borderTop: "1px solid var(--border)", color: "var(--primary)" }}
            >
              Clear
            </button>
          )}
        </FilterPill>

        <FilterPill label={actorFilter ? `Actor: ${actorFilter}` : "Actor"} active={!!actorFilter}>
          <form
            className="px-3 py-1"
            onSubmit={(e) => { e.preventDefault(); applyActor(actorQuery.trim()); }}
          >
            <input
              type="text"
              value={actorQuery}
              onChange={(e) => setActorQuery(e.target.value)}
              placeholder="Filter by email…"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none bg-md-surface-container-low text-md-on-surface placeholder:text-md-on-surface/50"
            />
            <p className="text-xs text-gray-400 mt-1.5 px-1">Press Enter to apply</p>
          </form>
          {actorFilter && (
            <button
              onClick={() => { setActorQuery(""); applyActor(""); }}
              className="w-full text-left px-4 py-2 text-sm font-medium transition-colors hover:bg-md-primary/10"
              style={{ borderTop: "1px solid var(--border)", color: "var(--primary)" }}
            >
              Clear
            </button>
          )}
        </FilterPill>

        <FilterPill label={targetFilter.length > 0 ? `Target (${targetFilter.length})` : "Target"} active={targetFilter.length > 0}>
          {RESOURCE_TYPES.map((rt) => (
            <CheckItem
              key={rt.value}
              label={rt.label}
              checked={targetFilter.includes(rt.value)}
              onToggle={() =>
                applyTargets(
                  targetFilter.includes(rt.value)
                    ? targetFilter.filter((t) => t !== rt.value)
                    : [...targetFilter, rt.value]
                )
              }
            />
          ))}
          {targetFilter.length > 0 && (
            <button
              onClick={() => applyTargets([])}
              className="w-full text-left px-4 py-2 mt-1 text-sm font-medium transition-colors hover:bg-md-primary/10"
              style={{ borderTop: "1px solid var(--border)", color: "var(--primary)" }}
            >
              Clear
            </button>
          )}
        </FilterPill>
      </div>

      {/* Table */}
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
            {hasFilters ? "No events match the selected filters." : "No events recorded yet."}
          </div>
        ) : (
          <div className="rounded-xl overflow-auto flex-1 min-h-0" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className={thCls} style={{ backgroundColor: "#f9fafb", width: 36 }} />
                  <th className={thCls} style={{ backgroundColor: "#f9fafb" }}>Timestamp (local time)</th>
                  <th className={thCls} style={{ backgroundColor: "#f9fafb" }}>Action</th>
                  <th className={thCls} style={{ backgroundColor: "#f9fafb" }}>Actor</th>
                  {isSuperAdmin && <th className={thCls} style={{ backgroundColor: "#f9fafb" }}>Tenant</th>}
                  <th className={`${thCls} w-full`} style={{ backgroundColor: "#f9fafb" }}>Target</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const hasDiff = hasVisibleChanges(log);
                  const isOpen = expanded.has(log.id);
                  return (
                    <FragmentRow
                      key={log.id}
                      log={log}
                      hasDiff={hasDiff}
                      isOpen={isOpen}
                      showTenant={isSuperAdmin}
                      onToggle={() => toggleExpanded(log.id)}
                    />
                  );
                })}
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
        onChange={(p) => { setPage(p); setExpanded(new Set()); setLoading(true); }}
      />
    </div>
  );
}

function FragmentRow({ log, hasDiff, isOpen, showTenant, onToggle }: { log: AuditLog; hasDiff: boolean; isOpen: boolean; showTenant: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        style={{ borderTop: "1px solid var(--border)" }}
        className={hasDiff ? "cursor-pointer transition-colors hover:bg-md-primary/5" : undefined}
        onClick={hasDiff ? onToggle : undefined}
      >
        <td className="pl-3 py-3 align-middle">
          {hasDiff && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              aria-label={isOpen ? "Collapse details" : "Expand details"}
              aria-expanded={isOpen}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors"
            >
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: isOpen ? "rotate(90deg)" : undefined, transition: "transform 0.12s" }}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 align-middle">{formatTimestamp(log.createdAt)}</td>
        <td className="px-4 py-2.5 text-gray-800 align-middle" style={{ minWidth: 180 }}>
          <span className="flex items-center gap-2.5">
            <ActivityIcon action={log.action} />
            {actionLabel(log.action)}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-gray-700 align-middle">{log.actorName || log.actorEmail}</td>
        {showTenant && <td className="px-4 py-3 whitespace-nowrap text-gray-700 align-middle">{log.tenantName ?? "—"}</td>}
        <td className="px-4 py-3 text-gray-700 align-middle">{targetOf(log)}</td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={showTenant ? 6 : 5} className="px-4 pb-4 pt-1">
            <ChangeDetails log={log} />
          </td>
        </tr>
      )}
    </>
  );
}
