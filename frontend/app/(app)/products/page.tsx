"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import SlideOver, { SlideOverHeader, SlideOverField } from "@/components/SlideOver";
import { cadenceLabel, cadenceBadgeStyle } from "@/lib/cadence";

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingCadence: string;
  status: string;
  createdAt: string;
};

type Plan = {
  id: number;
  productId: number;
  name: string;
  price: number;
  currency: string;
  billingCadence: string;
  createdAt: string;
};

type Page<T> = { content: T[]; page: { totalElements: number; totalPages: number; size: number; number: number } };

const STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE"] as const;

const CADENCES = ["WEEKLY", "FORTNIGHT", "MONTHLY", "QUARTERLY", "ANNUALLY"];


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ProductsPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAdmin = user?.role === "TENANT_ADMIN";

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // Sidebar state
  const [selected, setSelected] = useState<Product | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingPlan, setAddingPlan] = useState(false);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editCadence, setEditCadence] = useState("MONTHLY");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New plan form
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planCadence, setPlanCadence] = useState("MONTHLY");
  const [planSearch, setPlanSearch] = useState("");

  const PAGE_SIZE = 20;
  const tid = user?.tenantId;

  const load = (f = filter, q = search, p = page) => {
    if (!token || !tid) return;
    setLoading(true);
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(p), sort: "createdAt,desc" });
    if (f !== "ALL") params.set("status", f);
    if (q.trim()) params.set("search", q.trim());
    apiGet<Page<Product>>(`/api/v1/tenants/${tid}/products?${params}`, token)
      .then((d) => { setProducts(d.content); setTotal(d.page.totalElements); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token, user]);

  const loadPlans = (productId: number) => {
    if (!token || !tid) return;
    setPlansLoading(true);
    apiGet<Plan[]>(`/api/v1/tenants/${tid}/products/${productId}/plans`, token)
      .then((d) => setPlans(d))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  };

  const openProduct = (p: Product) => {
    setSelected(p);
    setEditing(false);
    setAddingPlan(false);
    setFormError(null);
    loadPlans(p.id);
  };

  const startEdit = () => {
    if (!selected) return;
    setEditName(selected.name);
    setEditDesc(selected.description ?? "");
    setEditPrice(String(selected.price));
    setEditCurrency(selected.currency);
    setEditCadence(selected.billingCadence);
    setFormError(null);
    setEditing(true);
    setAddingPlan(false);
  };

  const saveProduct = async () => {
    if (!token || !tid || !selected) return;
    if (!editName.trim() || !editPrice) { setFormError("Name and price are required."); return; }
    setSaving(true); setFormError(null);
    try {
      await apiPatch<Product>(`/api/v1/tenants/${tid}/products/${selected.id}`, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        price: Number(editPrice),
        currency: editCurrency,
        billingCadence: editCadence,
      }, token);
      load();
      setEditing(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const addPlan = async () => {
    if (!token || !tid || !selected) return;
    if (!planName.trim() || !planPrice) return;
    setSaving(true);
    try {
      await apiPost(`/api/v1/tenants/${tid}/products/${selected.id}/plans`, {
        name: planName.trim(),
        price: Number(planPrice),
        currency: selected.currency,
        billingCadence: planCadence,
      }, token);
      setPlanName(""); setPlanPrice(""); setPlanCadence("MONTHLY");
      setAddingPlan(false);
      loadPlans(selected.id);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const filteredPlans = plans.filter((pl) => pl.name.toLowerCase().includes(planSearch.toLowerCase()));

  const inputCls = "w-full text-sm px-3 py-2 rounded-lg outline-none";
  const inputStyle = { border: "1px solid var(--border)", backgroundColor: "#fff" };
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <>
      <div className="px-6 py-8 md:px-10 max-w-7xl mx-auto space-y-6" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products &amp; Plans</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} products</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setSelected(null); setEditing(true); setEditName(""); setEditDesc(""); setEditPrice(""); setEditCurrency("USD"); setEditCadence("MONTHLY"); setFormError(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Add Product
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--border)" }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(0); load(f, search, 0); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all"
                style={
                  filter === f
                    ? { backgroundColor: "#fff", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }
                    : { color: "#6b7280" }
                }
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); load(filter, e.target.value, 0); }}
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg outline-none"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            Loading…
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400 rounded-xl" style={{ border: "1px dashed var(--border)" }}>
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p, i) => (
              <button
                key={p.id}
                onClick={() => openProduct(p)}
                className="text-left rounded-xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: `1px solid ${selected?.id === p.id ? "var(--primary)" : "var(--border)"}`,
                  animation: "fade-in-up 0.2s ease-out both",
                  animationDelay: `${i * 30}ms`,
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{p.name}</h3>
                  <span
                    className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md"
                    style={p.status === "ACTIVE" ? { backgroundColor: "#dcfce7", color: "#166534" } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
                  >
                    {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                  </span>
                </div>
                {p.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.description}</p>}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{p.currency} {Number(p.price).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{cadenceLabel(p.billingCadence)}</p>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => { const p = page - 1; setPage(p); load(filter, search, p); }} className="px-3 py-1.5 rounded-lg font-medium disabled:opacity-40" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>Prev</button>
              <button disabled={page >= totalPages - 1} onClick={() => { const p = page + 1; setPage(p); load(filter, search, p); }} className="px-3 py-1.5 rounded-lg font-medium disabled:opacity-40" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Product detail / edit sidebar */}
      <SlideOver open={!!selected || (isAdmin && editing && !selected)} onClose={() => { setSelected(null); setEditing(false); }} width="50vw">
        {editing && !selected ? (
          // Create new product
          <>
            <SlideOverHeader title="New Product" onClose={() => setEditing(false)} />
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div><label className={labelCls}>Name *</label><input className={inputCls} style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Product name" /></div>
              <div><label className={labelCls}>Description</label><textarea className={inputCls} style={inputStyle} rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Optional description" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Price *</label><input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="0.00" /></div>
                <div><label className={labelCls}>Currency</label><input className={inputCls} style={inputStyle} value={editCurrency} onChange={(e) => setEditCurrency(e.target.value.toUpperCase())} placeholder="USD" /></div>
              </div>
              <div>
                <label className={labelCls}>Billing Cadence</label>
                <div className="flex gap-2 flex-wrap">
                  {CADENCES.map((c) => (
                    <button key={c} onClick={() => setEditCadence(c)} className="text-xs px-3 py-1.5 rounded-md font-medium transition-all"
                      style={editCadence === c ? { backgroundColor: "var(--primary)", color: "#fff" } : { border: "1px solid var(--border)", color: "#6b7280" }}>
                      {cadenceLabel(c)}
                    </button>
                  ))}
                </div>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setEditing(false)} className="flex-1 py-2 text-sm font-medium rounded-lg text-gray-600" style={{ border: "1px solid var(--border)" }}>Cancel</button>
              <button onClick={async () => {
                if (!token || !tid || !editName.trim() || !editPrice) { setFormError("Name and price are required."); return; }
                setSaving(true); setFormError(null);
                try {
                  await apiPost<Product>(`/api/v1/tenants/${tid}/products`, { name: editName.trim(), description: editDesc.trim() || null, price: Number(editPrice), currency: editCurrency, billingCadence: editCadence }, token);
                  load(); setEditing(false);
                } catch (e) { setFormError(e instanceof Error ? e.message : "Failed to create."); }
                finally { setSaving(false); }
              }} disabled={saving} className="flex-1 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--primary)" }}>
                {saving ? "Creating…" : "Create Product"}
              </button>
            </div>
          </>
        ) : selected ? (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "#fff" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {editing && (
                    <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                      Back
                    </button>
                  )}
                  <h2 className="text-xl font-bold text-gray-900 leading-snug">{selected.name}</h2>
                  {!editing && (
                    <span
                      className="inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded"
                      style={selected.status === "ACTIVE" ? { backgroundColor: "#dbeafe", color: "#1d4ed8" } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
                    >
                      {selected.status.charAt(0) + selected.status.slice(1).toLowerCase()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setSelected(null); setEditing(false); setAddingPlan(false); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div
              key={editing ? "edit" : "detail"}
              className="flex-1 overflow-y-auto"
              style={{ animation: "slide-in-from-right 0.2s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
            >
              {editing ? (
                <div className="px-6 py-5 space-y-4">
                  <div><label className={labelCls}>Name</label><input className={inputCls} style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                  <div><label className={labelCls}>Description</label><textarea className={inputCls} style={inputStyle} rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Price</label><input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} /></div>
                    <div><label className={labelCls}>Currency</label><input className={inputCls} style={inputStyle} value={editCurrency} onChange={(e) => setEditCurrency(e.target.value.toUpperCase())} /></div>
                  </div>
                  <div>
                    <label className={labelCls}>Billing Cadence</label>
                    <div className="flex gap-2 flex-wrap">
                      {CADENCES.map((c) => (
                        <button key={c} onClick={() => setEditCadence(c)} className="text-xs px-3 py-1.5 rounded-md font-medium transition-all"
                          style={editCadence === c ? { backgroundColor: "var(--primary)", color: "#fff" } : { border: "1px solid var(--border)", color: "#6b7280" }}>
                          {cadenceLabel(c)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {formError && <p className="text-sm text-red-600">{formError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditing(false)} className="flex-1 py-2 text-sm font-medium rounded-lg text-gray-600" style={{ border: "1px solid var(--border)" }}>Cancel</button>
                    <button onClick={saveProduct} disabled={saving} className="flex-1 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--primary)" }}>{saving ? "Saving…" : "Save"}</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Detail rows */}
                  <div className="px-6 py-2">
                    {selected.description && <SlideOverField label="Description">{selected.description}</SlideOverField>}
                    <SlideOverField label="Active">
                      {selected.status === "ACTIVE"
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        : <span className="text-gray-400">—</span>}
                    </SlideOverField>
                    <SlideOverField label="Created at">{formatDateTime(selected.createdAt)}</SlideOverField>
                    <SlideOverField label="Base price">{selected.currency} {Number(selected.price).toFixed(2)} / {cadenceLabel(selected.billingCadence)}</SlideOverField>
                  </div>

                  {/* Action buttons */}
                  {isAdmin && (
                    <div className="px-6 pb-5 pt-2 flex gap-3">
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                        Edit product
                      </button>
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                        Delete product
                      </button>
                    </div>
                  )}

                  <div style={{ borderTop: "1px solid var(--border)" }} />

                  {/* Plans section */}
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-base font-semibold text-gray-900">Product plans</h3>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search"
                            value={planSearch}
                            onChange={(e) => setPlanSearch(e.target.value)}
                            className="text-sm pl-8 pr-3 py-1.5 rounded-lg outline-none"
                            style={{ border: "1px solid var(--border)", width: "160px", backgroundColor: "#fff" }}
                          />
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => { setAddingPlan(true); setPlanName(""); setPlanPrice(""); setPlanCadence("MONTHLY"); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap"
                            style={{ backgroundColor: "var(--primary)" }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                            Add product plan
                          </button>
                        )}
                      </div>
                    </div>

                    {plansLoading ? (
                      <div className="py-8 text-center text-sm text-gray-400">Loading plans…</div>
                    ) : (
                      <>
                        {filteredPlans.length > 0 ? (
                          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                            <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[360px]">
                              <thead>
                                <tr style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadence</th>
                                  <th className="px-4 py-3"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredPlans.map((pl, i) => (
                                  <tr
                                    key={pl.id}
                                    className="hover:bg-[#eef3ee] transition-colors"
                                    style={{ borderTop: "1px solid var(--border)", backgroundColor: "#f8faf8", animation: "fade-in 0.12s ease-out both", animationDelay: `${i * 15}ms` }}
                                  >
                                    <td className="px-4 py-3 font-medium text-gray-900">{pl.name}</td>
                                    <td className="px-4 py-3 text-gray-600">{pl.currency} {Number(pl.price).toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                      <span className="text-xs font-semibold px-2.5 py-1 rounded" style={cadenceBadgeStyle(pl.billingCadence)}>
                                        {cadenceLabel(pl.billingCadence)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <button className="p-1 rounded text-gray-300 hover:text-gray-500 transition-colors">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center text-sm text-gray-400 rounded-lg" style={{ border: "1px dashed var(--border)" }}>
                            {plans.length === 0 ? "No plans yet." : "No plans match your search."}
                          </div>
                        )}

                        {isAdmin && addingPlan && (
                          <div className="mt-4 space-y-3 p-4 rounded-lg" style={{ border: "1px solid var(--border)", backgroundColor: "#f8faf8" }}>
                            <p className="text-sm font-semibold text-gray-700">New plan</p>
                            <input className={inputCls} style={inputStyle} placeholder="Plan name" value={planName} onChange={(e) => setPlanName(e.target.value)} />
                            <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} placeholder="Price" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} />
                            <div className="flex gap-2 flex-wrap">
                              {CADENCES.map((c) => (
                                <button key={c} onClick={() => setPlanCadence(c)} className="text-xs px-2.5 py-1 rounded-md font-medium transition-all"
                                  style={planCadence === c ? { backgroundColor: "var(--primary)", color: "#fff" } : { border: "1px solid var(--border)", color: "#6b7280" }}>
                                  {cadenceLabel(c)}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setAddingPlan(false)} className="flex-1 py-1.5 text-xs font-medium rounded-lg text-gray-600" style={{ border: "1px solid var(--border)" }}>Cancel</button>
                              <button onClick={addPlan} disabled={saving || !planName || !planPrice} className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--primary)" }}>{saving ? "Adding…" : "Add Plan"}</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
      </SlideOver>
    </>
  );
}
