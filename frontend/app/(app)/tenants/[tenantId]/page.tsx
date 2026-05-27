"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Archive,
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  Globe,
  Mail,
  Mailbox,
  Package,
  PauseOctagon,
  Send,
  AlertCircle,
  SkipForward,
  UserCircle2,
  Users,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { tenantsApi } from "@/lib/api/tenants"
import { dashboardApi } from "@/lib/api/dashboard"
import { customersApi } from "@/lib/api/customers"
import { productsApi } from "@/lib/api/products"
import { plansApi } from "@/lib/api/plans"
import { friendlyError } from "@/lib/axios"
import {
  formatCurrency,
  formatDate,
  initials,
  timeAgo,
} from "@/lib/utils"

interface QuickLink {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  count?: number
  sub?: string
}

export default function TenantDetailPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const qc = useQueryClient()
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const tenant = useQuery({
    queryKey: ["tenants", tenantId],
    queryFn: () => tenantsApi.get(tenantId),
  })

  const summary = useQuery({
    queryKey: ["dashboard-summary", tenantId],
    queryFn: () => dashboardApi.summary(tenantId),
  })

  const reminderStats = useQuery({
    queryKey: ["dashboard-reminder-stats", tenantId],
    queryFn: () => dashboardApi.reminderStats(tenantId),
  })

  const customers = useQuery({
    queryKey: ["customers", tenantId, 0, 5],
    queryFn: () => customersApi.list(tenantId, 0, 5),
  })

  const products = useQuery({
    queryKey: ["products", tenantId, 0, 5],
    queryFn: () => productsApi.list(tenantId, 0, 5),
  })

  const plans = useQuery({
    queryKey: ["plans", tenantId, 0, 5],
    queryFn: () => plansApi.listAll(tenantId, 0, 5),
  })

  const suspend = useMutation({
    mutationFn: () => tenantsApi.suspend(tenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants", tenantId] })
      qc.invalidateQueries({ queryKey: ["tenants"] })
      toast.success("Tenant suspended")
      setConfirmSuspend(false)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const archive = useMutation({
    mutationFn: () => tenantsApi.archive(tenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants", tenantId] })
      qc.invalidateQueries({ queryKey: ["tenants"] })
      toast.success("Tenant archived")
      setConfirmArchive(false)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const t = tenant.data
  const s = summary.data
  const rs = reminderStats.data

  return (
    <div className="space-y-6">
      {!t && <Skeleton className="h-28" />}

      {t && (
        <>
          {/* ── Info card + Quick links ────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(280_85%_60%)] text-primary-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-lg font-semibold leading-tight tracking-tight">
                        {t.name}
                      </h2>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.slug}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {t.status === "ACTIVE" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setConfirmSuspend(true)}
                    >
                      <PauseOctagon className="h-3.5 w-3.5" /> Suspend
                    </Button>
                  )}
                  {t.status !== "ARCHIVED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => setConfirmArchive(true)}
                    >
                      <Archive className="h-3.5 w-3.5" /> Archive
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> {t.companyEmail}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> {t.timezone}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Created{" "}
                  {formatDate(t.createdAt)}
                </span>
              </div>
            </Card>

            {/* Reminder stats mini card */}
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Reminders · last 30 days
              </p>
              {!rs ? (
                <Skeleton className="mt-3 h-16" />
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  {[
                    {
                      n: rs.sent,
                      label: "Sent",
                      icon: Send,
                      color: "text-success",
                    },
                    {
                      n: rs.failed,
                      label: "Failed",
                      icon: AlertCircle,
                      color: "text-destructive",
                    },
                    {
                      n: rs.skipped,
                      label: "Skipped",
                      icon: SkipForward,
                      color: "text-muted-foreground",
                    },
                  ].map((r) => (
                    <div key={r.label}>
                      <r.icon
                        className={`mx-auto mb-1 h-4 w-4 ${r.color}`}
                      />
                      <p className="font-display text-xl font-semibold tabular-nums">
                        {r.n}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Quick links row ────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {([
              {
                href: `/${tenantId}/customers`,
                label: "Customers",
                icon: UserCircle2,
                count: s?.totalCustomers,
                accent: "from-primary to-[hsl(280_85%_55%)]",
              },
              {
                href: `/${tenantId}/products`,
                label: "Products",
                icon: Package,
                count: s?.totalProducts,
                accent:
                  "from-[hsl(199_89%_48%)] to-[hsl(212_92%_45%)]",
              },
              {
                href: `/${tenantId}/plans`,
                label: "Plans",
                icon: ClipboardList,
                count:
                  s != null
                    ? s.activePlans + s.pausedPlans + s.cancelledPlans
                    : undefined,
                sub: s != null ? `${s.activePlans} active` : undefined,
                accent:
                  "from-[hsl(152_65%_38%)] to-[hsl(160_70%_42%)]",
              },
              {
                href: `/${tenantId}/reminders`,
                label: "Reminders",
                icon: Bell,
                accent:
                  "from-[hsl(38_92%_50%)] to-[hsl(28_92%_55%)]",
              },
              {
                href: `/${tenantId}/users`,
                label: "Team",
                icon: Users,
                accent:
                  "from-[hsl(340_65%_47%)] to-[hsl(350_70%_55%)]",
              },
              {
                href: `/${tenantId}/invitations`,
                label: "Invitations",
                icon: Mailbox,
                accent:
                  "from-[hsl(270_55%_50%)] to-[hsl(280_60%_60%)]",
              },
            ] satisfies QuickLink[]).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-2.5 rounded-xl border border-border bg-card/50 px-3 py-2.5 transition-all hover:border-primary/30 hover:shadow-soft"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${link.accent} text-white`}
                >
                  <link.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-sm font-medium">{link.label}</p>
                    {link.count != null && (
                      <span className="font-display text-sm font-semibold tabular-nums text-muted-foreground">
                        {link.count}
                      </span>
                    )}
                  </div>
                  {link.sub && (
                    <p className="text-[10px] text-muted-foreground">
                      {link.sub}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* ── Customers + Products ───────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Customers</CardTitle>
                  <CardDescription className="text-xs">
                    Recent customers in this tenant
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                  <Link href={`/${tenantId}/customers`}>
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {customers.isLoading && (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-11" />
                    ))}
                  </div>
                )}
                {customers.data?.content.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No customers yet.
                  </p>
                )}
                {customers.data?.content.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/${tenantId}/customers/${c.id}`}
                    className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-secondary"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px]">
                        {initials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {c.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.email}
                      </p>
                    </div>
                    <StatusBadge
                      status={c.status}
                      className="scale-90"
                    />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Products</CardTitle>
                  <CardDescription className="text-xs">
                    Subscription offerings
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                  <Link href={`/${tenantId}/products`}>
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {products.isLoading && (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-11" />
                    ))}
                  </div>
                )}
                {products.data?.content.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No products yet.
                  </p>
                )}
                {products.data?.content.slice(0, 5).map((p) => (
                  <Link
                    key={p.id}
                    href={`/${tenantId}/products/${p.id}`}
                    className="group flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-secondary"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.billingCadence.toLowerCase()} ·{" "}
                        {formatCurrency(p.price, p.currency)}
                      </p>
                    </div>
                    <StatusBadge
                      status={p.status}
                      className="scale-90"
                    />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── Plans ──────────────────────────────────────────── */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Recent plans</CardTitle>
                <CardDescription className="text-xs">
                  Latest customer–product subscriptions
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link href={`/${tenantId}/plans`}>
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {plans.isLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              )}
              {plans.data?.content.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No plans yet.
                </p>
              )}
              <div className="space-y-1.5">
                {plans.data?.content.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-secondary"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {initials(p.customerName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.customerName}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {p.productName} · {timeAgo(p.createdAt)}
                      </p>
                    </div>
                    {p.endsAt && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        Due {formatDate(p.endsAt)}
                      </Badge>
                    )}
                    <StatusBadge
                      status={p.status}
                      className="scale-90 shrink-0"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={confirmSuspend}
        onOpenChange={setConfirmSuspend}
        title="Suspend this tenant?"
        description="Suspended tenants cannot sign in until reactivated."
        confirmText="Suspend"
        destructive
        loading={suspend.isPending}
        onConfirm={() => suspend.mutate()}
      />
      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archive this tenant?"
        description="This is irreversible. The tenant's data will be retained but inaccessible."
        confirmText="Archive permanently"
        destructive
        loading={archive.isPending}
        onConfirm={() => archive.mutate()}
      />
    </div>
  )
}
