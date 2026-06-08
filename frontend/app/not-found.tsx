"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function NotFound() {
  const token = useAuthStore((s) => s.token);
  const href = token ? "/dashboard" : "/login";

  return (
    <div className="min-h-full flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
      <div className="text-center max-w-sm mx-auto px-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="56" height="56" className="mx-auto mb-6" style={{ color: "var(--primary)" }}>
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <h1 className="text-6xl font-bold mb-2" style={{ color: "#212529" }}>404</h1>
        <p className="text-base mb-6" style={{ color: "#6c757d" }}>This page doesn&apos;t exist.</p>
        <Link
          href={href}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Go home
        </Link>
      </div>
    </div>
  );
}
