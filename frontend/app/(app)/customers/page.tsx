"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

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
    Active:    { bg: "#24A37D", color: "#ffffff" },
    Paused:    { bg: "#9ca3af", color: "#ffffff" },
    Cancelled: { bg: "#dc2626", color: "#ffffff" },
    Expired:   { bg: "#374151", color: "#ffffff" },
  };
  const s = map[status] ?? { bg: "#9ca3af", color: "#ffffff" };
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {status}
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
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 8h.01M2 5.2v4.4745c0 .4892 0 .7338.0553.964.049.204.1298.3991.2394.5781.1237.2018.2966.3748.6426.7207l7.6686 7.6686c1.188 1.188 1.7821 1.7821 2.467 2.0046a3 3 0 0 0 1.8541 0c.685-.2225 1.2791-.8166 2.4671-2.0046l2.2118-2.2118c1.188-1.188 1.7821-1.7821 2.0046-2.4671a3 3 0 0 0 0-1.8541c-.2225-.6849-.8166-1.279-2.0046-2.467l-7.6686-7.6686c-.3459-.346-.5189-.5189-.7207-.6426a2 2 0 0 0-.5781-.2394C10.4083 2 10.1637 2 9.6745 2H5.2c-1.1201 0-1.6802 0-2.108.218a2 2 0 0 0-.874.874C2 3.5198 2 4.08 2 5.2M8.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0" />
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

const customers = [
  { id: "CUS-001", name: "Hannah Abbott",   email: "hannah.abbott@example.com",   plan: "Legacy Pro Plan",    status: "Active",    joined: "1/4/2025",  subs: 2 },
  { id: "CUS-002", name: "Marcus Reid",     email: "marcus.reid@techcorp.io",      plan: "Starter Monthly",    status: "Active",    joined: "3/12/2025", subs: 1 },
  { id: "CUS-003", name: "Alice Johnson",   email: "alice.johnson@example.com",    plan: "Growth Annual",      status: "Active",    joined: "11/2/2024", subs: 3 },
  { id: "CUS-004", name: "David Chen",      email: "d.chen@brightworks.com",       plan: "Enterprise",         status: "Active",    joined: "7/19/2024", subs: 1 },
  { id: "CUS-005", name: "Sarah O'Brien",   email: "sarah.obrien@mailme.net",      plan: "Starter Monthly",    status: "Paused",    joined: "2/28/2025", subs: 1 },
  { id: "CUS-006", name: "James Thornton",  email: "jthornton@finvault.com",       plan: "Growth Annual",      status: "Active",    joined: "5/5/2024",  subs: 2 },
  { id: "CUS-007", name: "Priya Nair",      email: "priya.nair@cloudsync.io",      plan: "Legacy Pro Plan",    status: "Cancelled", joined: "9/14/2024", subs: 0 },
  { id: "CUS-008", name: "Tom Bakker",      email: "tom.bakker@deltaops.nl",       plan: "Enterprise",         status: "Active",    joined: "4/1/2025",  subs: 1 },
  { id: "CUS-009", name: "Lena Hoffmann",   email: "lena.h@mirosoft.de",           plan: "Starter Monthly",    status: "Expired",   joined: "8/22/2024", subs: 0 },
  { id: "CUS-010", name: "Carlos Vega",     email: "cvega@stratosphere.mx",        plan: "Growth Annual",      status: "Active",    joined: "6/10/2024", subs: 2 },
  { id: "CUS-011", name: "Mei Lin",         email: "meilin@fastlane.sg",           plan: "Starter Monthly",    status: "Active",    joined: "5/17/2025", subs: 1 },
  { id: "CUS-012", name: "Jordan Blake",    email: "jordan.b@techcorp.io",         plan: "Legacy Pro Plan",    status: "Cancelled", joined: "12/3/2024", subs: 0 },
];

const headers: { label: string; icon?: React.ReactNode; sortable?: boolean }[] = [
  { label: "Customer",      icon: ColIcon.text,   sortable: true  },
  { label: "Name",          icon: ColIcon.text,   sortable: true  },
  { label: "Email",         icon: ColIcon.email                   },
  { label: "Plan",          icon: ColIcon.text,   sortable: true  },
  { label: "Status",        icon: ColIcon.status                  },
  { label: "Joined",        icon: ColIcon.date,   sortable: true  },
  { label: "Subscriptions", icon: ColIcon.status                  },
  { label: ""                                                      },
];

function CustomerTable() {
  const cols = [96, 152, 220, 160, 120, 112, 128, 40];
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
            {customers.map((row, i) => (
              <tr key={row.id} className="group bg-[#fef7fa] hover:bg-[#fdf2f8] transition-colors" style={{ borderTop: "1px solid var(--border)", animation: "fade-in 0.15s ease-out both", animationDelay: `${80 + i * 18}ms` }}>
                <td className="px-4 py-3 text-sm font-medium text-gray-700 truncate overflow-hidden">{row.id}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 truncate overflow-hidden">
                  <Link href={`/customers/${row.id}`} className="hover:text-primary transition-colors">{row.name}</Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 overflow-hidden"><CopyEmail email={row.email} /></td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate overflow-hidden">{row.plan}</td>
                <td className="px-4 py-3 overflow-hidden"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate overflow-hidden">{row.joined}</td>
                <td className="px-4 py-3 text-sm text-gray-700 overflow-hidden">
                  <span className="inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="opacity-40">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 10H2m0-1.8v7.6c0 1.1201 0 1.6802.218 2.108.1917.3763.4977.6823.874.874C3.5198 19 4.08 19 5.2 19h13.6c1.1201 0 1.6802 0 2.108-.218a2 2 0 0 0 .874-.874C22 17.4802 22 16.9201 22 15.8V8.2c0-1.1201 0-1.6802-.218-2.108a2 2 0 0 0-.874-.874C20.4802 5 19.9201 5 18.8 5H5.2c-1.1201 0-1.6802 0-2.108.218a2 2 0 0 0-.874.874C2 6.5198 2 7.08 2 8.2" />
                    </svg>
                    {row.subs}
                  </span>
                </td>
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

const stats = [
  { label: "Total Customers",   value: String(customers.length)                                              },
  { label: "Active",            value: String(customers.filter(c => c.status === "Active").length)           },
  { label: "Churned",           value: String(customers.filter(c => c.status === "Cancelled" || c.status === "Expired").length) },
  { label: "New This Month",    value: "3"                                                                    },
];

export default function CustomersPage() {
  const totalVal   = useCountUp(customers.length);
  const activeVal  = useCountUp(customers.filter(c => c.status === "Active").length);
  const churnedVal = useCountUp(customers.filter(c => c.status === "Cancelled" || c.status === "Expired").length);
  const newVal     = useCountUp(3);

  const statCards = [
    { label: "Total Customers", display: String(totalVal)   },
    { label: "Active",          display: String(activeVal)  },
    { label: "Churned",         display: String(churnedVal) },
    { label: "New This Month",  display: String(newVal)     },
  ];

  return (
    <div className="font-sans px-6 py-8 md:px-12 md:py-10 max-w-6xl mx-auto" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      {/* Header */}
      <div className="mb-8 border-l-4 pl-5 py-1" style={{ borderColor: "var(--primary)" }}>
        <p className="text-sm mb-1" style={{ color: "var(--primary)" }}>Directory</p>
        <h1 className="text-3xl font-bold" style={{ color: "#212529" }}>Customers</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((card, i) => (
          <div key={card.label} className="rounded-lg p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", animation: "fade-in-up 0.2s ease-out both", animationDelay: `${i * 35}ms` }}>
            <p className="text-sm mb-3" style={{ color: "#6c757d" }}>{card.label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: "#212529" }}>{card.display}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
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

      {/* Table */}
      <CustomerTable />

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>{customers.length} customers</span>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1.5 rounded-lg transition-colors hover:bg-[#f1eaed]" style={{ border: "1px solid var(--border)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="px-3 py-1.5 rounded-lg font-semibold text-xs" style={{ backgroundColor: "var(--nav-active)", color: "var(--primary)" }}>1</span>
          <button className="px-3 py-1.5 rounded-lg transition-colors hover:bg-[#f1eaed]" style={{ border: "1px solid var(--border)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
