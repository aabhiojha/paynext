import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"
import type { Page, RawPage } from "@/types/api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePage<T>(raw: RawPage<T>): Page<T> {
  if (raw?.page) {
    return {
      content: raw.content ?? [],
      totalElements: raw.page.totalElements ?? 0,
      totalPages: raw.page.totalPages ?? 0,
      pageNumber: raw.page.number ?? 0,
      pageSize: raw.page.size ?? 0,
    }
  }
  return {
    content: raw?.content ?? [],
    totalElements: raw?.totalElements ?? 0,
    totalPages: raw?.totalPages ?? 0,
    pageNumber: raw?.pageable?.pageNumber ?? 0,
    pageSize: raw?.pageable?.pageSize ?? 0,
  }
}

export const formatDate = (iso?: string | null) =>
  iso ? format(new Date(iso), "MMM d, yyyy") : "—"

export const formatDateTime = (iso?: string | null) =>
  iso ? format(new Date(iso), "MMM d, yyyy · HH:mm") : "—"

export const timeAgo = (iso?: string | null) =>
  iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : "—"

export function formatCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
