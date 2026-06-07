"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPost } from "@/lib/api";
import SlideOver, { SlideOverField, SlideOverHeader, SlideOverSection } from "@/components/SlideOver";

function useColumnResize(initialWidths: number[]) {
  const [widths, setWidths] = useState(initialWidths);
  const dragging = useRef<{ col: number; startX: number; startW: number } | null>(null);

  const onMouseDown = useCallback(
    (col: number, e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = { col, startX: e.clientX, startW: widths[col] };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (e: MouseEvent) => {
        if (!dragging.current) return;
        const { col, startX, startW } = dragging.current;
        setWidths((prev) =>
          prev.map((w, i) => (i === col ? Math.max(60, startW + (e.clientX - startX)) : w))
        );
      };
      const onUp = () => {
        dragging.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [widths]
  );

  return { widths, onMouseDown };
}

type TenantStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

type Tenant = {
  id: number;
  name: string;
  email: string;
  timezone: string;
  status: TenantStatus;
  planName: string | null;
  planPrice: number | null;
  planCurrency: string | null;
  planCadence: string | null;
  createdAt: string;
};

type Plan = {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCadence: string;
};

type ApiActivePlan = {
  planId: number;
  planName: string;
  effectivePrice: number;
  currency: string;
  billingCadence: string;
};

type ApiTenant = {
  id: number;
  name: string;
  companyEmail: string;
  timezone: string;
  status: string;
  createdAt: string;
  activePlan: ApiActivePlan | null;
};

type ApiTenantPage = {
  content: ApiTenant[];
  totalElements: number;
};

type ApiPlan = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingCadence: string;
  status: string;
};

type ApiTenantDetail = {
  id: number;
  name: string;
  slug: string;
  companyEmail: string;
  timezone: string;
  status: string;
  archivedAt: string | null;
  suspensionReason: string | null;
  archivalReason: string | null;
  createdAt: string;
  updatedAt: string;
  activePlan: {
    id: number;
    tenantId: number;
    planId: number;
    planName: string;
    effectivePrice: number;
    currency: string;
    billingCadence: string;
    status: string;
    startDate: string;
    endDate: string;
    createdAt: string;
  } | null;
};

type ApiAssignPlanResponse = {
  id: number;
  tenantId: number;
  planId: number;
  planName: string;
  effectivePrice: number;
  currency: string;
  billingCadence: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
};

const cadenceLabel: Record<string, string> = {
  WEEKLY: "/ wk",
  FORTNIGHT: "/ 2wk",
  MONTHLY: "/ mo",
  QUARTERLY: "/ qtr",
  ANNUALLY: "/ yr",
};

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function mapTenant(t: ApiTenant): Tenant {
  return {
    id: t.id,
    name: t.name,
    email: t.companyEmail,
    timezone: t.timezone,
    status: t.status as TenantStatus,
    planName: t.activePlan?.planName ?? null,
    planPrice: t.activePlan ? Number(t.activePlan.effectivePrice) : null,
    planCurrency: t.activePlan?.currency ?? null,
    planCadence: t.activePlan?.billingCadence ?? null,
    createdAt: formatDate(t.createdAt),
  };
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const cfg: Record<TenantStatus, { bg: string; label: string }> = {
    ACTIVE:    { bg: "#24A37D", label: "Active"    },
    SUSPENDED: { bg: "#ef4444", label: "Suspended" },
    ARCHIVED:  { bg: "#6b7280", label: "Archived"  },
  };
  const c = cfg[status];
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: c.bg, color: "#fff" }}>
      {c.label}
    </span>
  );
}

function SortIcon({ dir, active }: { dir: "asc" | "desc"; active: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1.5" style={{ opacity: active ? 1 : 0.4 }}>
      {dir === "asc" ? (
        <path d="m7 15 5 5 5-5" />
      ) : (
        <path d="m7 9 5-5 5 5" />
      )}
    </svg>
  );
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div onMouseDown={onMouseDown} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-pink-200 transition-colors" />
  );
}

const colHeaders: { label: string; sortable?: boolean }[] = [
  { label: "Tenant",    sortable: true },
  { label: "Email"                     },
  { label: "Timezone"                  },
  { label: "Plan",      sortable: true },
  { label: "Status"                    },
  { label: "Created",   sortable: true },
  { label: ""                          },
];

const sortFieldMap: Record<string, keyof Tenant> = {
  Tenant: "name",
  Plan: "planName",
  Created: "createdAt",
};

function TenantsTable({
  data,
  onSuspend,
  onActivate,
  onSelect,
  sortField,
  sortDir,
  onSort,
}: {
  data: Tenant[];
  onSuspend: (t: Tenant) => void;
  onActivate: (t: Tenant) => void;
  onSelect: (t: Tenant) => void;
  sortField: string | null;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const cols = [160, 200, 170, 190, 110, 130, 52];
  const { widths, onMouseDown } = useColumnResize(cols);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="overflow-x-auto">
        <table style={{ tableLayout: "fixed", width: "100%", minWidth: widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-card)" }}>
              {colHeaders.map((h, i) => {
                const active = sortField === h.label;
                return (
                  <th
                    key={i}
                    className="relative text-left px-4 py-3 text-sm font-semibold text-gray-700 select-none overflow-hidden"
                    style={h.sortable ? { cursor: "pointer" } : undefined}
                    onClick={h.sortable ? () => onSort(h.label) : undefined}
                  >
                    <span className="truncate flex items-center pr-2">
                      {h.label}
                      {h.sortable && <SortIcon dir={active ? sortDir : "asc"} active={active} />}
                    </span>
                    {i < colHeaders.length - 1 && <ResizeHandle onMouseDown={(e) => onMouseDown(i, e)} />}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
              {data.map((row, i) => (
              <tr
                key={row.id}
                className="group bg-[#fef7fa] hover:bg-[#fdf2f8] transition-colors"
                style={{
                  borderTop: "1px solid var(--border)",
                  animation: "fade-in 0.15s ease-out both",
                  animationDelay: `${80 + i * 18}ms`,
                  opacity: row.status === "ARCHIVED" ? 0.6 : row.status === "SUSPENDED" ? 0.75 : 1,
                  cursor: "pointer",
                }}
                onClick={() => onSelect(row)}
              >
                <td className="px-4 py-3 overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      {row.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{row.name}</p>
                      <p className="text-xs text-gray-400 truncate">#{row.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 truncate overflow-hidden">{row.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600 truncate overflow-hidden">{row.timezone}</td>
                <td className="px-4 py-3 overflow-hidden">
                  {row.planName ? (
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{row.planName}</p>
                      <p className="text-xs text-gray-400">
                        {row.planCurrency} {row.planPrice?.toLocaleString()}{cadenceLabel[row.planCadence ?? ""] ?? ""}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No plan</span>
                  )}
                </td>
                <td className="px-4 py-3 overflow-hidden">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 truncate overflow-hidden">{row.createdAt}</td>
                <td className="px-4 py-3 text-right pr-3">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {row.status === "ACTIVE" ? (
                      <button onClick={() => onSuspend(row)} className="hover:text-red-500 transition-colors text-gray-400" title="Suspend">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="10" x2="10" y1="15" y2="9" /><line x1="14" x2="14" y1="15" y2="9" />
                        </svg>
                      </button>
                    ) : row.status === "SUSPENDED" ? (
                      <button onClick={() => onActivate(row)} className="hover:text-green-600 transition-colors text-gray-400" title="Reactivate">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type CreateForm = {
  name: string;
  email: string;
  timezone: string;
  selectedPlanId: number | null;
  customPrice: string;
};

const emptyForm: CreateForm = {
  name: "",
  email: "",
  timezone: "UTC",
  selectedPlanId: null,
  customPrice: "",
};

function PlanCard({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-xl p-4 transition-all"
      style={{
        border: selected ? "2px solid var(--primary)" : "1.5px solid var(--border)",
        backgroundColor: selected ? "var(--nav-active)" : "#fff",
        boxShadow: selected ? "0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent)" : "none",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{plan.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{plan.description}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-bold" style={{ color: "var(--primary)" }}>
            {plan.currency} {plan.price.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">{cadenceLabel[plan.billingCadence] ?? plan.billingCadence}</p>
        </div>
      </div>
      {selected && (
        <div className="mt-2.5 flex items-center gap-1.5" style={{ color: "var(--primary)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5L20 7" />
          </svg>
          <span className="text-xs font-semibold">Selected</span>
        </div>
      )}
    </button>
  );
}

function NoPlanCard({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-xl p-4 transition-all"
      style={{
        border: selected ? "2px solid #6b7280" : "1.5px dashed var(--border)",
        backgroundColor: selected ? "#f9fafb" : "#fafafa",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-600">No plan yet</p>
          <p className="text-xs text-gray-400">Assign a plan later from tenant settings</p>
        </div>
      </div>
      {selected && (
        <div className="mt-2 flex items-center gap-1.5 text-gray-500">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5L20 7" />
          </svg>
          <span className="text-xs font-semibold">Selected</span>
        </div>
      )}
    </button>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
      style={{
        backgroundColor: active || done ? "var(--primary)" : "var(--border)",
        color: active || done ? "#fff" : "#9ca3af",
      }}
    >
      {done ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7" />
        </svg>
      ) : label}
    </div>
  );
}

function CreateTenantModal({
  plans,
  onClose,
  onSubmit,
  saving,
}: {
  plans: Plan[];
  onClose: () => void;
  onSubmit: (form: CreateForm) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [step, setStep] = useState<1 | 2>(1);

  const set = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => setPortalMounted(true), []);

  const canProceed = form.name.trim() && form.email.trim() && form.timezone;
  const selectedPlan = plans.find((p) => p.id === form.selectedPlanId) ?? null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
      <div
        className="rounded-2xl shadow-2xl w-full mx-auto flex flex-col"
        style={{
          backgroundColor: "#fef7fa",
          border: "1px solid var(--border)",
          maxWidth: step === 2 ? "680px" : "480px",
          maxHeight: "92dvh",
          animation: "fade-in-up 0.18s ease-out both",
        }}
      >
        <div className="flex items-center justify-between px-7 pt-6 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create New Tenant</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <StepDot active={step === 1} done={step > 1} label="1" />
              <div className="w-8 h-px" style={{ backgroundColor: step > 1 ? "var(--primary)" : "var(--border)" }} />
              <StepDot active={step === 2} done={false} label="2" />
              <span className="text-xs text-gray-400 ml-1">{step === 1 ? "Tenant details" : "Assign a plan"}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-7 py-5">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Company Name <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
                  style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Admin Email <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <div className="relative">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none"
                    style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Timezone <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <div className="relative">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2" /><path d="M2 12h20" />
                  </svg>
                  <select
                    value={form.timezone}
                    onChange={(e) => set("timezone", e.target.value)}
                    className="w-full text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none appearance-none"
                    style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
                  >
                    {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 mb-4">
                Choose the platform plan for{" "}
                <span className="font-semibold text-gray-700">{form.name}</span>.{" "}
                You can change this later.
              </p>

              {plans.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No active plans available. Create one first.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      selected={form.selectedPlanId === plan.id}
                      onSelect={() => set("selectedPlanId", form.selectedPlanId === plan.id ? null : plan.id)}
                    />
                  ))}
                  <NoPlanCard
                    selected={form.selectedPlanId === null}
                    onSelect={() => set("selectedPlanId", null)}
                  />
                </div>
              )}

              {selectedPlan && (
                <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: "#fff", border: "1px solid var(--border)" }}>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Custom Price (optional)</p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                        {selectedPlan.currency}
                      </span>
                      <input
                        type="number"
                        value={form.customPrice}
                        onChange={(e) => set("customPrice", e.target.value)}
                        placeholder={String(selectedPlan.price)}
                        className="w-full text-sm pl-11 pr-3 py-2 rounded-lg outline-none"
                        style={{ border: "1px solid var(--border)", backgroundColor: "#fafafa" }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      Default: {selectedPlan.currency} {selectedPlan.price.toLocaleString()}{cadenceLabel[selectedPlan.billingCadence]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Leave blank to use the plan&apos;s standard price.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-7 py-5" style={{ borderTop: "1px solid var(--border)" }}>
          {step === 1 ? (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors" style={{ border: "1px solid var(--border)", color: "#4b4b4b" }}>
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white transition-opacity"
                style={{ backgroundColor: "var(--primary)", opacity: canProceed ? 1 : 0.45 }}
              >
                Continue
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1.5 -mt-0.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                style={{ border: "1px solid var(--border)", color: "#4b4b4b" }}
                disabled={saving}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={() => onSubmit(form)}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                style={{ backgroundColor: "var(--primary)", opacity: saving ? 0.7 : 1 }}
              >
                {saving && (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
                {form.selectedPlanId ? "Create & Assign Plan" : "Create Tenant"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (!portalMounted) return null;
  return createPortal(modal, document.body);
}

function TenantSidebar({
  tenantId,
  open,
  token,
  plans,
  onClose,
  onSuspend,
  onActivate,
  onPlanAssigned,
}: {
  tenantId: number;
  open: boolean;
  token: string;
  plans: Plan[];
  onClose: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onPlanAssigned: () => void;
}) {
  const [detail, setDetail] = useState<ApiTenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [editingPlan, setEditingPlan] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setDetail(null);
    setEditingPlan(false);
    apiGet<ApiTenantDetail>(`/api/v1/tenants/${tenantId}`, token)
      .then((t) => { setDetail(t); setSelectedPlanId(t.activePlan?.planId ?? null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId, open, token]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  const handleAssign = async () => {
    if (!selectedPlanId || !token || !detail) return;
    setAssigning(true);
    try {
      await apiPost<ApiAssignPlanResponse>(
        `/api/v1/tenants/${tenantId}/platform-plan`,
        { planId: selectedPlanId, customPrice: customPrice ? parseFloat(customPrice) : null, startDate: null, endDate: null },
        token
      );
      const updated = await apiGet<ApiTenantDetail>(`/api/v1/tenants/${tenantId}`, token);
      setDetail(updated);
      onPlanAssigned();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to assign plan");
    } finally {
      setAssigning(false);
    }
  };

  const status = detail?.status as TenantStatus | undefined;

  return (
    <SlideOver open={open} onClose={onClose}>
      <SlideOverHeader
        title={loading ? "Loading…" : (detail?.name ?? "Tenant")}
        badge={detail && <StatusBadge status={detail.status as TenantStatus} />}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <svg className="animate-spin mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Loading…
          </div>
        ) : error ? (
          <SlideOverSection>
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
          </SlideOverSection>
        ) : detail ? (
          <>
            <SlideOverSection>
              <SlideOverField label="Email">{detail.companyEmail}</SlideOverField>
              <SlideOverField label="Timezone">{detail.timezone}</SlideOverField>
              <SlideOverField label="ID / Slug">#{detail.id} · {detail.slug}</SlideOverField>
              <SlideOverField label="Created at">{formatDate(detail.createdAt)}</SlideOverField>
            </SlideOverSection>

            <SlideOverSection title="Current Plan">
              {detail.activePlan ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{detail.activePlan.planName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {detail.activePlan.currency} {detail.activePlan.effectivePrice?.toLocaleString()}
                        {cadenceLabel[detail.activePlan.billingCadence] ?? ""}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingPlan(!editingPlan)}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
                    >
                      {editingPlan ? "Cancel" : "Edit"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(detail.activePlan.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {" → "}
                    {new Date(detail.activePlan.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  {editingPlan && (
                    <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <select
                        value={selectedPlanId ?? ""}
                        onChange={(e) => setSelectedPlanId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
                        style={{ border: "1px solid var(--border)", backgroundColor: "#fafafa" }}
                      >
                        <option value="">— Select a plan —</option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.currency} {p.price}{cadenceLabel[p.billingCadence] ?? ""})
                          </option>
                        ))}
                      </select>
                      {selectedPlan && (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">{selectedPlan.currency}</span>
                          <input
                            type="number"
                            value={customPrice}
                            onChange={(e) => setCustomPrice(e.target.value)}
                            placeholder={`Default: ${selectedPlan.price}`}
                            className="w-full text-sm pl-11 pr-3 py-2.5 rounded-lg outline-none"
                            style={{ border: "1px solid var(--border)", backgroundColor: "#fafafa" }}
                          />
                        </div>
                      )}
                      <button
                        onClick={handleAssign}
                        disabled={!selectedPlanId || assigning}
                        className="w-full py-2.5 text-sm font-semibold rounded-lg text-white flex items-center justify-center gap-2"
                        style={{ backgroundColor: "var(--primary)", opacity: !selectedPlanId || assigning ? 0.5 : 1 }}
                      >
                        {assigning && (
                          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        )}
                        Save Plan
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-400 italic mb-3">No plan assigned</p>
                  {editingPlan ? (
                    <div className="space-y-3">
                      <select
                        value={selectedPlanId ?? ""}
                        onChange={(e) => setSelectedPlanId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
                        style={{ border: "1px solid var(--border)", backgroundColor: "#fafafa" }}
                      >
                        <option value="">— Select a plan —</option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.currency} {p.price}{cadenceLabel[p.billingCadence] ?? ""})
                          </option>
                        ))}
                      </select>
                      {selectedPlan && (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">{selectedPlan.currency}</span>
                          <input
                            type="number"
                            value={customPrice}
                            onChange={(e) => setCustomPrice(e.target.value)}
                            placeholder={`Default: ${selectedPlan.price}`}
                            className="w-full text-sm pl-11 pr-3 py-2.5 rounded-lg outline-none"
                            style={{ border: "1px solid var(--border)", backgroundColor: "#fafafa" }}
                          />
                        </div>
                      )}
                      <button
                        onClick={handleAssign}
                        disabled={!selectedPlanId || assigning}
                        className="w-full py-2.5 text-sm font-semibold rounded-lg text-white flex items-center justify-center gap-2"
                        style={{ backgroundColor: "var(--primary)", opacity: !selectedPlanId || assigning ? 0.5 : 1 }}
                      >
                        {assigning && (
                          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        )}
                        Assign Plan
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingPlan(true)}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
                    >
                      Assign Plan
                    </button>
                  )}
                </div>
              )}
            </SlideOverSection>

            <div className="px-6 py-4 flex gap-3 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
              {status === "ACTIVE" && (
                <button
                  onClick={onSuspend}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ border: "1px solid #fecaca", color: "#dc2626", backgroundColor: "#fff5f5" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="10" x2="10" y1="15" y2="9" /><line x1="14" x2="14" y1="15" y2="9" />
                  </svg>
                  Suspend tenant
                </button>
              )}
              {status === "SUSPENDED" && (
                <button
                  onClick={onActivate}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ border: "1px solid #bbf7d0", color: "#16a34a", backgroundColor: "#f0fdf4" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Reactivate tenant
                </button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </SlideOver>
  );
}

export default function TenantsPage() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sidebarTenantId, setSidebarTenantId] = useState<number | null>(null);

  const handleSort = useCallback((field: string) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortDir("asc");
      return field;
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiGet<ApiTenantPage>("/api/v1/tenants?size=100&sort=createdAt,desc", token),
      apiGet<ApiPlan[]>("/api/v1/platform-plans?activeOnly=true", token),
    ])
      .then(([tenantPage, planList]) => {
        setData(tenantPage.content.map(mapTenant));
        setPlans(
          planList.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description ?? "",
            price: Number(p.price),
            currency: p.currency,
            billingCadence: p.billingCadence,
          }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const active = data.filter((t) => t.status === "ACTIVE");
  const suspended = data.filter((t) => t.status === "SUSPENDED");
  const onPlans = data.filter((t) => t.planName !== null);
  const filtered =
    filterStatus === "ALL" ? data.filter((t) => t.status !== "ARCHIVED") : data.filter((t) => t.status === filterStatus);

  const sorted = sortField ? [...filtered].sort((a, b) => {
    const field = sortFieldMap[sortField];
    if (!field) return 0;
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  }) : filtered;

  const handleSelectTenant = useCallback((t: Tenant) => {
    setSidebarTenantId(t.id);
  }, []);

  const handlePlanAssigned = useCallback(() => {
    if (!token) return;
    apiGet<ApiTenantPage>("/api/v1/tenants?size=100&sort=createdAt,desc", token)
      .then((page) => setData(page.content.map(mapTenant)))
      .catch(() => {});
  }, [token]);

  const handleCreate = async (form: CreateForm) => {
    if (!token) return;
    setSaving(true);
    try {
      const created = await apiPost<ApiTenant>("/api/v1/tenants", {
        name: form.name,
        companyEmail: form.email,
        timezone: form.timezone,
        planId: form.selectedPlanId ?? null,
        customPlanPrice: form.customPrice ? parseFloat(form.customPrice) : null,
      }, token);
      setData((prev) => [mapTenant(created), ...prev]);
      setShowCreate(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create tenant");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async (t: Tenant) => {
    if (!token) return;
    try {
      const updated = await apiPost<ApiTenant>(`/api/v1/tenants/${t.id}/suspend`, { reason: "" }, token);
      setData((prev) => prev.map((x) => (x.id === t.id ? mapTenant(updated) : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to suspend tenant");
    }
  };

  const handleActivate = async (t: Tenant) => {
    if (!token) return;
    try {
      const updated = await apiPost<ApiTenant>(`/api/v1/tenants/${t.id}/reactivate`, {}, token);
      setData((prev) => prev.map((x) => (x.id === t.id ? mapTenant(updated) : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reactivate tenant");
    }
    return;
  };

  const statCards = [
    { label: "Total Tenants", value: data.length      },
    { label: "Active",        value: active.length    },
    { label: "Suspended",     value: suspended.length },
    { label: "On a Plan",     value: onPlans.length   },
  ];

  return (
    <div className="font-sans px-6 py-8 md:px-12 md:py-10 max-w-6xl mx-auto" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      <div className="mb-8 border-l-4 pl-5 py-1" style={{ borderColor: "var(--primary)" }}>
        <p className="text-sm mb-1" style={{ color: "var(--primary)" }}>Super Admin</p>
        <h1 className="text-3xl font-bold" style={{ color: "#212529" }}>Tenants</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((card, i) => (
          <div key={card.label} className="rounded-lg p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", animation: "fade-in-up 0.2s ease-out both", animationDelay: `${i * 35}ms` }}>
            <p className="text-sm mb-3" style={{ color: "#6c757d" }}>{card.label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: "#212529" }}>{loading ? "—" : card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={filterStatus === s
                ? { backgroundColor: "var(--nav-active)", color: "var(--primary)", border: "1px solid var(--primary)" }
                : { border: "1px solid var(--border)", backgroundColor: "#fef7fa", color: "#4b4b4b" }}>
              {s === "ALL" ? "All" : s === "ACTIVE" ? "Active" : "Suspended"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg text-white transition-opacity hover:opacity-90 flex-shrink-0 self-start md:self-auto"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create Tenant
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="animate-spin mr-3" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading tenants…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm12 0v6m-3-3h6" />
          </svg>
          <p className="text-sm">No tenants found</p>
        </div>
      ) : (
        <TenantsTable data={sorted} onSuspend={handleSuspend} onActivate={handleActivate} onSelect={handleSelectTenant} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
      )}

      {!loading && !error && (
        <p className="mt-4 text-sm text-gray-500">
          {filtered.length} tenant{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {showCreate && (
        <CreateTenantModal
          plans={plans}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          saving={saving}
        />
      )}

      {token && sidebarTenantId !== null && (
        <TenantSidebar
          tenantId={sidebarTenantId}
          open={sidebarTenantId !== null}
          token={token}
          plans={plans}
          onClose={() => setSidebarTenantId(null)}
          onSuspend={() => {
            const t = data.find((x) => x.id === sidebarTenantId);
            if (t) handleSuspend(t).then(() => setSidebarTenantId(null));
          }}
          onActivate={() => {
            const t = data.find((x) => x.id === sidebarTenantId);
            if (t) handleActivate(t).then(() => setSidebarTenantId(null));
          }}
          onPlanAssigned={handlePlanAssigned}
        />
      )}
    </div>
  );
}
