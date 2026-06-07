"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { apiGet } from "@/lib/api";

function useCountUp(target: number, duration = 450) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function useColumnResize(initialWidths: number[]) {
  const [widths, setWidths] = useState(initialWidths);
  const dragging = useRef<{ col: number; startX: number; startW: number } | null>(null);

  const onMouseDown = useCallback((col: number, e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { col, startX: e.clientX, startW: widths[col] };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const { col, startX, startW } = dragging.current;
      const next = Math.max(60, startW + (e.clientX - startX));
      setWidths((prev) => prev.map((w, i) => (i === col ? next : w)));
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
  }, [widths]);

  return { widths, onMouseDown };
}

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
};

type ApiCustomer = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
};

type ApiCustomerPage = {
  content: ApiCustomer[];
  totalElements: number;
  totalPages: number;
  number: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const handleClick = () => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleClick} className="flex items-center gap-1.5 transition-colors text-left group">
      {copied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-xs font-medium" style={{ color: "var(--primary)" }}>Copied!</span>
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-gray-400 group-hover:text-primary transition-colors">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <span className="group-hover:text-primary transition-colors">{email}</span>
        </>
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    ACTIVE:    { bg: "#24A37D", color: "#ffffff" },
    PAUSED:    { bg: "#9ca3af", color: "#ffffff" },
    CANCELLED: { bg: "#dc2626", color: "#ffffff" },
    DELETED:   { bg: "#374151", color: "#ffffff" },
  };
  const s = map[status] ?? { bg: "#9ca3af", color: "#ffffff" };
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {label}
    </span>
  );
}

function SearchInput({ placeholder, className = "" }: { placeholder: string; className?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className={`relative ${className}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        className="text-sm pl-9 pr-4 py-2 rounded-lg outline-none w-full transition-colors"
        style={{ border: "1px solid var(--border)", backgroundColor: hovered ? "#e4dee1" : "var(--bg-search)", color: "#1a1a1a" }}
      />
    </div>
  );
}

function SortIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1.5 opacity-40">
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-pink-200 transition-colors"
    />
  );
}

const ColIcon = {
  text: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7c0-.9319 0-1.3978.1522-1.7654a2 2 0 0 1 1.0824-1.0824C5.6022 4 6.0681 4 7 4h10c.9319 0 1.3978 0 1.7654.1522.49.203.8794.5924 1.0824 1.0824C20 5.6022 20 6.0681 20 7M9 20h6M12 4v16" />
    </svg>
  ),
  status: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 12 2 2 4-4" />
    </svg>
  ),
  date: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H3m13-8v4M8 2v4m-.2 16h8.4c1.6802 0 2.5202 0 3.162-.327a3 3 0 0 0 1.311-1.311C21 19.7202 21 18.8802 21 17.2V8.8c0-1.6802 0-2.5202-.327-3.162a3 3 0 0 0-1.311-1.311C18.7202 4 17.8802 4 16.2 4H7.8c-1.6802 0-2.5202 0-3.162.327a3 3 0 0 0-1.311 1.311C3 6.2798 3 7.1198 3 8.8v8.4c0 1.6802 0 2.5202.327 3.162a3 3 0 0 0 1.311 1.311C5.2798 22 6.1198 22 7.8 22" />
    </svg>
  ),
  email: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m2 7 8.1649 5.7154c.6612.4629.9918.6943 1.3514.7839.3176.0792.6498.0792.9674 0 .3596-.0896.6902-.321 1.3514-.7839L22 7M6.8 20h10.4c1.6802 0 2.5202 0 3.162-.327a3 3 0 0 0 1.311-1.311C22 17.7202 22 16.8802 22 15.2V8.8c0-1.6802 0-2.5202-.327-3.162a3 3 0 0 0-1.311-1.311C19.7202 4 18.8802 4 17.2 4H6.8c-1.6802 0-2.5202 0-3.162.327a3 3 0 0 0-1.311 1.311C2 6.2798 2 7.1198 2 8.8v6.4c0 1.6802 0 2.5202.327 3.162a3 3 0 0 0 1.311 1.311C4.2798 20 5.1198 20 6.8 20" />
    </svg>
  ),
};

const headers: { label: string; icon?: React.ReactNode; sortable?: boolean }[] = [
  { label: "ID",          icon: ColIcon.text                    },
  { label: "Name",        icon: ColIcon.text,   sortable: true  },
  { label: "Email",       icon: ColIcon.email                   },
  { label: "Phone",       icon: ColIcon.text                    },
  { label: "Status",      icon: ColIcon.status                  },
  { label: "Joined",      icon: ColIcon.date,   sortable: true  },
  { label: ""                                                    },
];

function CustomerTable({ data }: { data: Customer[] }) {
  const cols = [96, 152, 220, 130, 120, 112, 40];
  const { widths, onMouseDown } = useColumnResize(cols);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="overflow-x-auto">
        <table style={{ tableLayout: "fixed", width: "100%", minWidth: widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-card)" }}>
              {headers.map((h, i) => (
                <th key={i} className="relative text-left px-4 py-3 text-sm font-semibold text-gray-700 select-none overflow-hidden">
                  <span className="truncate flex items-center pr-2">{h.icon}{h.label}{h.sortable && <SortIcon />}</span>
                  {i < headers.length - 1 && <ResizeHandle onMouseDown={(e) => onMouseDown(i, e)} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id} className="group bg-[#fef7fa] hover:bg-[#fdf2f8] transition-colors" style={{ borderTop: "1px solid var(--border)", animation: "fade-in 0.15s ease-out both", animationDelay: `${80 + i * 18}ms` }}>
                <td className="px-4 py-3 text-sm font-medium text-gray-700 truncate overflow-hidden">#{row.id}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 truncate overflow-hidden">
                  <Link href={`/customers/${row.id}`} className="hover:text-primary transition-colors">{row.name}</Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 overflow-hidden"><CopyEmail email={row.email} /></td>
                <td className="px-4 py-3 text-sm text-gray-600 truncate overflow-hidden">{row.phone ?? <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3 overflow-hidden"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate overflow-hidden">{row.createdAt}</td>
                <td className="px-4 py-3 text-sm text-gray-400 text-center">
                  <button className="hover:text-gray-600">···</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [data, setData] = useState<Customer[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user?.tenantId) return;
    setLoading(true);
    apiGet<ApiCustomerPage>(
      `/api/v1/tenants/${user.tenantId}/customers?page=${page}&size=20&sort=createdAt,desc`,
      token
    )
      .then((res) => {
        setData(res.content.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          status: c.status,
          createdAt: formatDate(c.createdAt),
        })));
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, user, page]);

  const active = data.filter((c) => c.status === "ACTIVE").length;
  const churned = data.filter((c) => c.status === "CANCELLED" || c.status === "DELETED").length;

  const totalVal   = useCountUp(!loading ? totalElements : 0);
  const activeVal  = useCountUp(!loading ? active : 0);
  const churnedVal = useCountUp(!loading ? churned : 0);

  const statCards = [
    { label: "Total Customers", display: loading ? "—" : String(totalVal)   },
    { label: "Active",          display: loading ? "—" : String(activeVal)  },
    { label: "Churned",         display: loading ? "—" : String(churnedVal) },
    { label: "This Page",       display: loading ? "—" : String(data.length) },
  ];

  return (
    <div className="font-sans px-6 py-8 md:px-12 md:py-10 max-w-6xl mx-auto" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      <div className="mb-8 border-l-4 pl-5 py-1" style={{ borderColor: "var(--primary)" }}>
        <p className="text-sm mb-1" style={{ color: "var(--primary)" }}>Directory</p>
        <h1 className="text-3xl font-bold" style={{ color: "#212529" }}>Customers</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((card, i) => (
          <div key={card.label} className="rounded-lg p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", animation: "fade-in-up 0.2s ease-out both", animationDelay: `${i * 35}ms` }}>
            <p className="text-sm mb-3" style={{ color: "#6c757d" }}>{card.label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: "#212529" }}>{card.display}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {["Status", "Plan"].map((f) => (
            <button key={f} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg" style={{ border: "1px solid var(--border)", backgroundColor: "#fef7fa", color: "#4b4b4b" }}>
              {f}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <SearchInput placeholder="Search customers..." className="w-full md:w-60" />
          <button
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white flex-shrink-0 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Customer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="animate-spin mr-3" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading customers…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          </svg>
          <p className="text-sm">No customers yet. Add your first customer to get started.</p>
        </div>
      ) : (
        <CustomerTable data={data} />
      )}

      {!loading && !error && data.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>{totalElements} customer{totalElements !== 1 ? "s" : ""}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg transition-colors hover:bg-[#f1eaed] disabled:opacity-40"
                style={{ border: "1px solid var(--border)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="px-3 py-1.5 rounded-lg font-semibold text-xs" style={{ backgroundColor: "var(--nav-active)", color: "var(--primary)" }}>
                {page + 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg transition-colors hover:bg-[#f1eaed] disabled:opacity-40"
                style={{ border: "1px solid var(--border)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
