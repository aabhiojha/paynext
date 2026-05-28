"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Link from "next/link"
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Ban,
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardList,
  Globe,
  Mail,
  Mailbox,
  Package,
  PauseCircle,
  PauseOctagon,
  Pencil,
  Phone,
  PlayCircle,
  Plus,
  RefreshCw,
  Send,
  SkipForward,
  StickyNote,
  Trash2,
  UserCircle2,
  Users,
  X,
  XCircle,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { tenantsApi } from "@/lib/api/tenants"
import { dashboardApi } from "@/lib/api/dashboard"
import { customersApi } from "@/lib/api/customers"
import { productsApi } from "@/lib/api/products"
import { plansApi } from "@/lib/api/plans"
import { remindersApi } from "@/lib/api/reminders"
import { usersApi } from "@/lib/api/users"
import { invitationsApi } from "@/lib/api/invitations"
import { friendlyError } from "@/lib/axios"
import {
  cn,
  formatCurrency,
  formatDate,
  initials,
  timeAgo,
  titleCase,
} from "@/lib/utils"
import type {
  BillingCadence,
  CustomerResponse,
  CustomerProductResponse,
  ProductResponse,
} from "@/types/api"

type CustomerDialogState = { mode: "create" } | { mode: "edit"; target: CustomerResponse }
type ProductDialogState = { mode: "create" } | { mode: "edit"; target: ProductResponse }
type PlanDialogState = { mode: "create" } | { mode: "edit"; target: CustomerProductResponse }

type Section =
  | "customers"
  | "products"
  | "plans"
  | "reminders"
  | "users"
  | "invitations"
  | null

const SECTIONS: {
  key: Section & string
  label: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
}[] = [
  { key: "customers", label: "Customers", icon: UserCircle2, accent: "from-primary to-[hsl(280_85%_55%)]" },
  { key: "products", label: "Products", icon: Package, accent: "from-[hsl(199_89%_48%)] to-[hsl(212_92%_45%)]" },
  { key: "plans", label: "Plans", icon: ClipboardList, accent: "from-[hsl(152_65%_38%)] to-[hsl(160_70%_42%)]" },
  { key: "reminders", label: "Reminders", icon: Bell, accent: "from-[hsl(38_92%_50%)] to-[hsl(28_92%_55%)]" },
  { key: "users", label: "Team", icon: Users, accent: "from-[hsl(340_65%_47%)] to-[hsl(350_70%_55%)]" },
  { key: "invitations", label: "Invitations", icon: Mailbox, accent: "from-[hsl(270_55%_50%)] to-[hsl(280_60%_60%)]" },
]

export default function TenantDetailPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const qc = useQueryClient()
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>(null)

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<CustomerProductResponse | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number; name: string; extra?: number } | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")

  const [customerDialog, setCustomerDialog] = useState<CustomerDialogState | null>(null)
  const [productDialog, setProductDialog] = useState<ProductDialogState | null>(null)
  const [planDialog, setPlanDialog] = useState<PlanDialogState | null>(null)

  const tenant = useQuery({ queryKey: ["tenants", tenantId], queryFn: () => tenantsApi.get(tenantId) })
  const summary = useQuery({ queryKey: ["dashboard-summary", tenantId], queryFn: () => dashboardApi.summary(tenantId) })
  const rsQuery = useQuery({ queryKey: ["dashboard-reminder-stats", tenantId], queryFn: () => dashboardApi.reminderStats(tenantId) })

  const previewCustomers = useQuery({ queryKey: ["preview-customers", tenantId], queryFn: () => customersApi.list(tenantId, 0, 5) })
  const previewProducts = useQuery({ queryKey: ["preview-products", tenantId], queryFn: () => productsApi.list(tenantId, 0, 5) })
  const previewPlans = useQuery({ queryKey: ["preview-plans", tenantId], queryFn: () => plansApi.listAll(tenantId, 0, 5) })

  const customers = useQuery({ queryKey: ["tenantpage-customers", tenantId], queryFn: () => customersApi.list(tenantId, 0, 20), enabled: activeSection === "customers" })
  const products = useQuery({ queryKey: ["tenantpage-products", tenantId], queryFn: () => productsApi.list(tenantId, 0, 20), enabled: activeSection === "products" })
  const plans = useQuery({ queryKey: ["tenantpage-plans", tenantId], queryFn: () => plansApi.listAll(tenantId, 0, 20), enabled: activeSection === "plans" })
  const reminders = useQuery({ queryKey: ["tenantpage-reminders", tenantId], queryFn: () => remindersApi.list(tenantId, 0, 20), enabled: activeSection === "reminders" })
  const usersQ = useQuery({ queryKey: ["tenantpage-users", tenantId], queryFn: () => usersApi.list(tenantId, 0, 20), enabled: activeSection === "users" })
  const invitationsQ = useQuery({ queryKey: ["tenantpage-invitations", tenantId], queryFn: () => invitationsApi.list(tenantId, 0, 20), enabled: activeSection === "invitations" })

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["tenantpage-customers", tenantId] })
    qc.invalidateQueries({ queryKey: ["tenantpage-products", tenantId] })
    qc.invalidateQueries({ queryKey: ["tenantpage-plans", tenantId] })
    qc.invalidateQueries({ queryKey: ["tenantpage-reminders", tenantId] })
    qc.invalidateQueries({ queryKey: ["tenantpage-users", tenantId] })
    qc.invalidateQueries({ queryKey: ["tenantpage-invitations", tenantId] })
    qc.invalidateQueries({ queryKey: ["preview-customers", tenantId] })
    qc.invalidateQueries({ queryKey: ["preview-products", tenantId] })
    qc.invalidateQueries({ queryKey: ["preview-plans", tenantId] })
    qc.invalidateQueries({ queryKey: ["dashboard-summary", tenantId] })
  }

  const suspend = useMutation({
    mutationFn: () => tenantsApi.suspend(tenantId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Tenant suspended"); setConfirmSuspend(false) },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const archive = useMutation({
    mutationFn: () => tenantsApi.archive(tenantId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Tenant archived"); setConfirmArchive(false) },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const deleteCustomer = useMutation({
    mutationFn: (id: number) => customersApi.delete(tenantId, id),
    onSuccess: () => { invalidateAll(); setSelectedCustomer(null); setConfirmDelete(null); toast.success("Customer deleted") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const deleteProduct = useMutation({
    mutationFn: (id: number) => productsApi.delete(tenantId, id),
    onSuccess: () => { invalidateAll(); setSelectedProduct(null); setConfirmDelete(null); toast.success("Product deleted") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const deletePlan = useMutation({
    mutationFn: ({ customerId, cpId }: { customerId: number; cpId: number }) => plansApi.delete(tenantId, customerId, cpId),
    onSuccess: () => { invalidateAll(); setSelectedPlan(null); setConfirmDelete(null); toast.success("Plan deleted") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const setPlanStatus = useMutation({
    mutationFn: ({ customerId, cpId, status }: { customerId: number; cpId: number; status: "ACTIVE" | "PAUSED" | "CANCELLED" }) =>
      plansApi.setStatus(tenantId, customerId, cpId, status),
    onSuccess: () => { invalidateAll(); setSelectedPlan(null); toast.success("Plan status updated") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const disableUser = useMutation({
    mutationFn: (userId: number) => usersApi.disable(tenantId, userId),
    onSuccess: () => { invalidateAll(); toast.success("User disabled") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const deleteUser = useMutation({
    mutationFn: (userId: number) => usersApi.delete(tenantId, userId),
    onSuccess: () => { invalidateAll(); setConfirmDelete(null); toast.success("User deleted") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const revokeInvitation = useMutation({
    mutationFn: (id: number) => invitationsApi.revoke(tenantId, id),
    onSuccess: () => { invalidateAll(); toast.success("Invitation revoked") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const resendInvitation = useMutation({
    mutationFn: (id: number) => invitationsApi.resend(tenantId, id),
    onSuccess: () => { invalidateAll(); toast.success("Invitation resent") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const inviteUser = useMutation({
    mutationFn: (email: string) => invitationsApi.inviteUser(tenantId, email),
    onSuccess: () => { invalidateAll(); setInviteEmail(""); toast.success("Invitation sent") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const triggerReminders = useMutation({
    mutationFn: () => remindersApi.trigger(tenantId),
    onSuccess: () => { invalidateAll(); toast.success("Reminders triggered") },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const createCustomer = useMutation({
    mutationFn: (data: CustomerFormValues) => customersApi.create(tenantId, normalizeCustomer(data)),
    onSuccess: () => { invalidateAll(); setCustomerDialog(null); toast.success("Customer created") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const updateCustomer = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CustomerFormValues }) =>
      customersApi.update(tenantId, id, normalizeCustomer(data)),
    onSuccess: () => { invalidateAll(); setCustomerDialog(null); toast.success("Customer updated") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const createProduct = useMutation({
    mutationFn: (data: ProductFormValues) => productsApi.create(tenantId, normalizeProduct(data)),
    onSuccess: () => { invalidateAll(); setProductDialog(null); toast.success("Product created") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductFormValues }) =>
      productsApi.update(tenantId, id, normalizeProduct(data)),
    onSuccess: () => { invalidateAll(); setProductDialog(null); toast.success("Product updated") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const createPlan = useMutation({
    mutationFn: ({ customerId, data }: { customerId: number; data: PlanCreateValues }) =>
      plansApi.assign(tenantId, customerId, normalizePlanAssign(data)),
    onSuccess: () => { invalidateAll(); setPlanDialog(null); toast.success("Plan created") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const updatePlan = useMutation({
    mutationFn: ({ customerId, cpId, data }: { customerId: number; cpId: number; data: PlanEditValues }) =>
      plansApi.update(tenantId, customerId, cpId, normalizePlanUpdate(data)),
    onSuccess: () => { invalidateAll(); setPlanDialog(null); toast.success("Plan updated") },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const t = tenant.data
  const s = summary.data
  const rsd = rsQuery.data

  function toggleSection(key: Section & string) {
    setActiveSection((prev) => (prev === key ? null : key))
    setSelectedCustomer(null)
    setSelectedProduct(null)
    setSelectedPlan(null)
  }

  const sectionCounts: Record<string, number | undefined> = {
    customers: s?.totalCustomers,
    products: s?.totalProducts,
    plans: s != null ? s.activePlans + s.pausedPlans + s.cancelledPlans : undefined,
  }

  function handleConfirmDelete() {
    if (!confirmDelete) return
    const { type, id, extra } = confirmDelete
    if (type === "customer") deleteCustomer.mutate(id)
    else if (type === "product") deleteProduct.mutate(id)
    else if (type === "plan" && extra != null) deletePlan.mutate({ customerId: extra, cpId: id })
    else if (type === "user") deleteUser.mutate(id)
  }

  return (
    <div className="space-y-6">
      {!t && <Skeleton className="h-28" />}

      {t && (
        <>
          {/* ── Mobile back link (sidebar hidden on <lg) ────── */}
          <Link
            href="/tenants"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-3 w-3" /> Back to tenants
          </Link>

          {/* ── Info card + Reminder stats ─────────────────────── */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(280_85%_60%)] text-primary-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base sm:text-lg font-semibold leading-tight tracking-tight truncate">{t.name}</h2>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{t.slug}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {t.status === "ACTIVE" && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setConfirmSuspend(true)}>
                      <PauseOctagon className="h-3.5 w-3.5" /> Suspend
                    </Button>
                  )}
                  {t.status !== "ARCHIVED" && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => setConfirmArchive(true)}>
                      <Archive className="h-3.5 w-3.5" /> Archive
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3 sm:mt-4 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" /> {t.companyEmail}</span>
                <span className="inline-flex items-center gap-1.5"><Globe className="h-3 w-3 shrink-0" /> {t.timezone}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3 shrink-0" /> Created {formatDate(t.createdAt)}</span>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reminders · last 30 days</p>
              {!rsd ? <Skeleton className="mt-3 h-16" /> : (
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  {[
                    { n: rsd.sent, label: "Sent", icon: Send, color: "text-success" },
                    { n: rsd.failed, label: "Failed", icon: AlertCircle, color: "text-destructive" },
                    { n: rsd.skipped, label: "Skipped", icon: SkipForward, color: "text-muted-foreground" },
                  ].map((r) => (
                    <div key={r.label}>
                      <r.icon className={`mx-auto mb-1 h-4 w-4 ${r.color}`} />
                      <p className="font-display text-xl font-semibold tabular-nums">{r.n}</p>
                      <p className="text-[10px] text-muted-foreground">{r.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Section tabs ───────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SECTIONS.map((sec) => {
              const isOpen = activeSection === sec.key
              const count = sectionCounts[sec.key]
              return (
                <button key={sec.key} type="button" onClick={() => toggleSection(sec.key)} className={cn(
                  "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                  isOpen ? "border-primary/40 bg-accent shadow-soft" : "border-border bg-card/50 hover:border-primary/30 hover:shadow-soft"
                )}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${sec.accent} text-white`}>
                    <sec.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-sm font-medium">{sec.label}</p>
                      {count != null && <span className="font-display text-sm font-semibold tabular-nums text-muted-foreground">{count}</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Default view ───────────────────────────────────── */}
          {!activeSection && (
            <div className="grid gap-6 lg:grid-cols-2 animate-fade-in">
              <Card>
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Recent customers</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleSection("customers")}>View all</Button>
                </CardHeader>
                <CardContent className="space-y-0.5">
                  {previewCustomers.isLoading && <ListSkeleton count={3} />}
                  {previewCustomers.data?.content.length === 0 && <Empty label="customers" />}
                  {previewCustomers.data?.content.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-secondary">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(c.name)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{c.email}</p>
                      </div>
                      <StatusBadge status={c.status} className="scale-90" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Recent products</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleSection("products")}>View all</Button>
                </CardHeader>
                <CardContent className="space-y-0.5">
                  {previewProducts.isLoading && <ListSkeleton count={3} />}
                  {previewProducts.data?.content.length === 0 && <Empty label="products" />}
                  {previewProducts.data?.content.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-secondary">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.billingCadence.toLowerCase()} · {formatCurrency(p.price, p.currency)}</p>
                      </div>
                      <StatusBadge status={p.status} className="scale-90" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Recent plans</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleSection("plans")}>View all</Button>
                </CardHeader>
                <CardContent className="space-y-0.5">
                  {previewPlans.isLoading && <ListSkeleton count={3} />}
                  {previewPlans.data?.content.length === 0 && <Empty label="plans" />}
                  {previewPlans.data?.content.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-secondary">
                      <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px]">{initials(p.customerName)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.customerName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{p.productName} · {timeAgo(p.createdAt)}</p>
                      </div>
                      {p.endsAt && <Badge variant="outline" className="hidden text-[10px] shrink-0 sm:inline-flex">Due {formatDate(p.endsAt)}</Badge>}
                      <StatusBadge status={p.status} className="scale-90 shrink-0" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Expanded section ───────────────────────────────── */}
          {activeSection && (
            <Card className="animate-fade-in">
              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{SECTIONS.find((sec) => sec.key === activeSection)?.label}</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {activeSection === "customers" && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCustomerDialog({ mode: "create" })}>
                        <Plus className="h-3 w-3" /> New
                      </Button>
                    )}
                    {activeSection === "products" && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setProductDialog({ mode: "create" })}>
                        <Plus className="h-3 w-3" /> New
                      </Button>
                    )}
                    {activeSection === "plans" && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPlanDialog({ mode: "create" })}>
                        <Plus className="h-3 w-3" /> New
                      </Button>
                    )}
                    {activeSection === "reminders" && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => triggerReminders.mutate()} disabled={triggerReminders.isPending}>
                        <Send className="h-3 w-3" /> <span className="hidden sm:inline">Trigger batch</span><span className="sm:hidden">Trigger</span>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveSection(null)}>
                      <X className="h-3.5 w-3.5" /> Close
                    </Button>
                  </div>
                </div>
                {activeSection === "invitations" && (
                  <form className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5" onSubmit={(e) => { e.preventDefault(); if (inviteEmail.trim()) inviteUser.mutate(inviteEmail.trim()) }}>
                    <Input placeholder="Email to invite…" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="h-8 sm:h-7 text-xs sm:flex-1 sm:max-w-xs" />
                    <Button variant="outline" size="sm" className="h-8 sm:h-7 text-xs w-full sm:w-auto" type="submit" disabled={inviteUser.isPending || !inviteEmail.trim()}>
                      <Plus className="h-3 w-3" /> Invite user
                    </Button>
                  </form>
                )}
              </CardHeader>
              <CardContent className="space-y-0.5">

                {/* ── Customers ── */}
                {activeSection === "customers" && (<>
                  {customers.isLoading && <ListSkeleton />}
                  {customers.data?.content.length === 0 && <Empty label="customers" />}
                  {customers.data?.content.map((c) => (
                    <div key={c.id}>
                      <button type="button" onClick={() => setSelectedCustomer(selectedCustomer?.id === c.id ? null : c)} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-secondary", selectedCustomer?.id === c.id && "bg-accent")}>
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(c.name)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{c.email}</p>
                        </div>
                        <StatusBadge status={c.status} className="scale-90" />
                        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", selectedCustomer?.id === c.id && "rotate-180")} />
                      </button>
                      {selectedCustomer?.id === c.id && (
                        <DetailPanel onClose={() => setSelectedCustomer(null)} actions={
                          <>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setCustomerDialog({ mode: "edit", target: c })}>
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ type: "customer", id: c.id, name: c.name })}>
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </>
                        }>
                          <DetailRow icon={Mail} label="Email" value={c.email} />
                          {c.phone && <DetailRow icon={Phone} label="Phone" value={c.phone} />}
                          {c.notes && <DetailRow icon={StickyNote} label="Notes" value={c.notes} />}
                          <DetailRow icon={Calendar} label="Created" value={formatDate(c.createdAt)} />
                          <DetailRow icon={Calendar} label="Updated" value={formatDate(c.updatedAt)} />
                        </DetailPanel>
                      )}
                    </div>
                  ))}
                </>)}

                {/* ── Products ── */}
                {activeSection === "products" && (<>
                  {products.isLoading && <ListSkeleton />}
                  {products.data?.content.length === 0 && <Empty label="products" />}
                  {products.data?.content.map((p) => (
                    <div key={p.id}>
                      <button type="button" onClick={() => setSelectedProduct(selectedProduct?.id === p.id ? null : p)} className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-secondary", selectedProduct?.id === p.id && "bg-accent")}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">{p.billingCadence.toLowerCase()} · {formatCurrency(p.price, p.currency)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge status={p.status} className="scale-90" />
                          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", selectedProduct?.id === p.id && "rotate-180")} />
                        </div>
                      </button>
                      {selectedProduct?.id === p.id && (
                        <DetailPanel onClose={() => setSelectedProduct(null)} actions={
                          <>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setProductDialog({ mode: "edit", target: p })}>
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ type: "product", id: p.id, name: p.name })}>
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </>
                        }>
                          <DetailRow icon={Package} label="Price" value={formatCurrency(p.price, p.currency)} />
                          <DetailRow icon={ClipboardList} label="Cadence" value={titleCase(p.billingCadence)} />
                          {p.description && <DetailRow icon={StickyNote} label="Description" value={p.description} />}
                          <DetailRow icon={Calendar} label="Created" value={formatDate(p.createdAt)} />
                          <DetailRow icon={Calendar} label="Updated" value={formatDate(p.updatedAt)} />
                        </DetailPanel>
                      )}
                    </div>
                  ))}
                </>)}

                {/* ── Plans ── */}
                {activeSection === "plans" && (<>
                  {plans.isLoading && <ListSkeleton />}
                  {plans.data?.content.length === 0 && <Empty label="plans" />}
                  {plans.data?.content.map((p) => (
                    <div key={p.id}>
                      <button type="button" onClick={() => setSelectedPlan(selectedPlan?.id === p.id ? null : p)} className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-secondary", selectedPlan?.id === p.id && "bg-accent")}>
                        <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px]">{initials(p.customerName)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.customerName}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{p.productName} · {timeAgo(p.createdAt)}</p>
                        </div>
                        {p.endsAt && <Badge variant="outline" className="hidden text-[10px] shrink-0 sm:inline-flex">Due {formatDate(p.endsAt)}</Badge>}
                        <StatusBadge status={p.status} className="scale-90 shrink-0" />
                        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", selectedPlan?.id === p.id && "rotate-180")} />
                      </button>
                      {selectedPlan?.id === p.id && (
                        <DetailPanel onClose={() => setSelectedPlan(null)} actions={
                          <div className="flex flex-wrap items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setPlanDialog({ mode: "edit", target: p })}>
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                            {p.status === "ACTIVE" && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setPlanStatus.mutate({ customerId: p.customerId, cpId: p.id, status: "PAUSED" })}>
                                <PauseCircle className="h-3 w-3" /> Pause
                              </Button>
                            )}
                            {p.status === "PAUSED" && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setPlanStatus.mutate({ customerId: p.customerId, cpId: p.id, status: "ACTIVE" })}>
                                <PlayCircle className="h-3 w-3" /> Resume
                              </Button>
                            )}
                            {(p.status === "ACTIVE" || p.status === "PAUSED") && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={() => setPlanStatus.mutate({ customerId: p.customerId, cpId: p.id, status: "CANCELLED" })}>
                                <XCircle className="h-3 w-3" /> Cancel
                              </Button>
                            )}
                            {p.status === "CANCELLED" && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ type: "plan", id: p.id, name: `${p.customerName} / ${p.productName}`, extra: p.customerId })}>
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            )}
                          </div>
                        }>
                          <DetailRow icon={UserCircle2} label="Customer" value={p.customerName} />
                          <DetailRow icon={Package} label="Product" value={p.productName} />
                          <DetailRow icon={Calendar} label="Starts" value={formatDate(p.startsAt)} />
                          {p.endsAt && <DetailRow icon={Calendar} label="Ends" value={formatDate(p.endsAt)} />}
                          {p.notes && <DetailRow icon={StickyNote} label="Notes" value={p.notes} />}
                          <DetailRow icon={Calendar} label="Created" value={formatDate(p.createdAt)} />
                        </DetailPanel>
                      )}
                    </div>
                  ))}
                </>)}

                {/* ── Reminders ── */}
                {activeSection === "reminders" && (<>
                  {reminders.isLoading && <ListSkeleton />}
                  {reminders.data?.content.length === 0 && <Empty label="reminders" />}
                  {reminders.data?.content.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-secondary transition-colors">
                      <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px]">{initials(r.customerName)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.customerName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{r.productName} · {timeAgo(r.createdAt)}</p>
                      </div>
                      <StatusBadge status={r.status} className="scale-90 shrink-0" />
                    </div>
                  ))}
                </>)}

                {/* ── Users ── */}
                {activeSection === "users" && (<>
                  {usersQ.isLoading && <ListSkeleton />}
                  {usersQ.data?.content.length === 0 && <Empty label="users" />}
                  {usersQ.data?.content.map((u) => (
                    <div key={u.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-secondary transition-colors">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(u.email)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.email}</p>
                        <p className="text-[11px] text-muted-foreground">{titleCase(u.role)} · Joined {formatDate(u.createdAt)}</p>
                      </div>
                      <StatusBadge status={u.status} className="scale-90" />
                      <div className="flex items-center gap-0.5 shrink-0">
                        {u.status === "ACTIVE" && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Disable" onClick={() => disableUser.mutate(u.id)}>
                            <Ban className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Delete" onClick={() => setConfirmDelete({ type: "user", id: u.id, name: u.email })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>)}

                {/* ── Invitations ── */}
                {activeSection === "invitations" && (<>
                  {invitationsQ.isLoading && <ListSkeleton />}
                  {invitationsQ.data?.content.length === 0 && <Empty label="invitations" />}
                  {invitationsQ.data?.content.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-secondary transition-colors">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(inv.email)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{inv.email}</p>
                        <p className="text-[11px] text-muted-foreground">{titleCase(inv.role)} · Expires {formatDate(inv.expiresAt)}</p>
                      </div>
                      <StatusBadge status={inv.status} className="scale-90" />
                      {inv.status === "PENDING" && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" title="Resend" onClick={() => resendInvitation.mutate(inv.id)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-destructive hover:text-destructive" title="Revoke" onClick={() => revokeInvitation.mutate(inv.id)}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </>)}

              </CardContent>
            </Card>
          )}
        </>
      )}

      <ConfirmDialog open={confirmSuspend} onOpenChange={setConfirmSuspend} title="Suspend this tenant?" description="Suspended tenants cannot sign in until reactivated." confirmText="Suspend" destructive loading={suspend.isPending} onConfirm={() => suspend.mutate()} />
      <ConfirmDialog open={confirmArchive} onOpenChange={setConfirmArchive} title="Archive this tenant?" description="This is irreversible. The tenant's data will be retained but inaccessible." confirmText="Archive permanently" destructive loading={archive.isPending} onConfirm={() => archive.mutate()} />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title={`Delete ${confirmDelete?.type}?`}
        description={`"${confirmDelete?.name}" will be permanently removed. This action cannot be undone.`}
        confirmText="Delete"
        destructive
        loading={deleteCustomer.isPending || deleteProduct.isPending || deletePlan.isPending || deleteUser.isPending}
        onConfirm={handleConfirmDelete}
      />

      <CustomerFormDialog
        state={customerDialog}
        onClose={() => setCustomerDialog(null)}
        onSubmit={(values) => {
          if (!customerDialog) return
          if (customerDialog.mode === "create") createCustomer.mutate(values)
          else updateCustomer.mutate({ id: customerDialog.target.id, data: values })
        }}
        loading={createCustomer.isPending || updateCustomer.isPending}
      />

      <ProductFormDialog
        state={productDialog}
        onClose={() => setProductDialog(null)}
        onSubmit={(values) => {
          if (!productDialog) return
          if (productDialog.mode === "create") createProduct.mutate(values)
          else updateProduct.mutate({ id: productDialog.target.id, data: values })
        }}
        loading={createProduct.isPending || updateProduct.isPending}
      />

      <PlanFormDialog
        state={planDialog}
        onClose={() => setPlanDialog(null)}
        tenantId={tenantId}
        onCreate={(customerId, values) => createPlan.mutate({ customerId, data: values })}
        onUpdate={(customerId, cpId, values) => updatePlan.mutate({ customerId, cpId, data: values })}
        loading={createPlan.isPending || updatePlan.isPending}
      />
    </div>
  )
}

function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-11" />
      ))}
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="py-8 text-center text-xs text-muted-foreground">No {label} yet.</p>
}

function DetailPanel({ onClose, actions, children }: { onClose: () => void; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-1 sm:mx-2.5 mb-2 mt-1 animate-fade-in rounded-lg border border-border bg-card/50 p-2.5 sm:p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Details</p>
        <div className="flex flex-wrap items-center gap-1">
          {actions}
          <button type="button" onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="mt-2 space-y-1.5 text-xs">{children}</div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="text-foreground break-all">{value}</span>
    </div>
  )
}

// ─── Form types / helpers ──────────────────────────────────────────────

type CustomerFormValues = {
  name: string
  email: string
  phone: string
  address: string
  notes: string
}

type ProductFormValues = {
  name: string
  description: string
  price: string
  currency: string
  billingCadence: BillingCadence
  status: "ACTIVE" | "INACTIVE"
}

type PlanCreateValues = {
  productId: number
  startsAt: string
  endsAt: string
  notes: string
}

type PlanEditValues = {
  startsAt: string
  endsAt: string
  notes: string
}

function normalizeCustomer(v: CustomerFormValues) {
  return {
    name: v.name.trim(),
    email: v.email.trim(),
    phone: v.phone.trim() || undefined,
    address: v.address.trim() || undefined,
    notes: v.notes.trim() || undefined,
  }
}

function normalizeProduct(v: ProductFormValues) {
  return {
    name: v.name.trim(),
    description: v.description.trim() || undefined,
    price: Number(v.price),
    currency: v.currency.trim().toUpperCase(),
    billingCadence: v.billingCadence,
    status: v.status,
  }
}

function toIso(local: string): string | undefined {
  if (!local) return undefined
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

function normalizePlanAssign(v: PlanCreateValues) {
  return {
    productId: v.productId,
    startsAt: toIso(v.startsAt),
    endsAt: toIso(v.endsAt),
    notes: v.notes.trim() || undefined,
  }
}

function normalizePlanUpdate(v: PlanEditValues) {
  return {
    startsAt: toIso(v.startsAt),
    endsAt: toIso(v.endsAt),
    notes: v.notes.trim() || undefined,
  }
}

function toLocalInput(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  // datetime-local needs YYYY-MM-DDTHH:mm without timezone.
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Dialogs ───────────────────────────────────────────────────────────

function CustomerFormDialog({
  state,
  onClose,
  onSubmit,
  loading,
}: {
  state: CustomerDialogState | null
  onClose: () => void
  onSubmit: (values: CustomerFormValues) => void
  loading: boolean
}) {
  const open = !!state
  const editing = state?.mode === "edit" ? state.target : null
  const [values, setValues] = useState<CustomerFormValues>({
    name: "", email: "", phone: "", address: "", notes: "",
  })

  useEffect(() => {
    if (!open) return
    setValues({
      name: editing?.name ?? "",
      email: editing?.email ?? "",
      phone: editing?.phone ?? "",
      address: editing?.address ?? "",
      notes: editing?.notes ?? "",
    })
  }, [open, editing])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle>
          <DialogDescription>{editing ? "Update customer details." : "Add a person or organisation being billed."}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(values) }}
          className="space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="cust-name" required>
              <Input id="cust-name" required value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
            </Field>
            <Field label="Email" htmlFor="cust-email" required>
              <Input id="cust-email" type="email" required value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
            </Field>
            <Field label="Phone" htmlFor="cust-phone">
              <Input id="cust-phone" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />
            </Field>
            <Field label="Address" htmlFor="cust-address">
              <Input id="cust-address" value={values.address} onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))} />
            </Field>
          </div>
          <Field label="Notes" htmlFor="cust-notes">
            <Textarea id="cust-notes" rows={3} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>{editing ? "Save changes" : "Create customer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProductFormDialog({
  state,
  onClose,
  onSubmit,
  loading,
}: {
  state: ProductDialogState | null
  onClose: () => void
  onSubmit: (values: ProductFormValues) => void
  loading: boolean
}) {
  const open = !!state
  const editing = state?.mode === "edit" ? state.target : null
  const [values, setValues] = useState<ProductFormValues>({
    name: "", description: "", price: "", currency: "USD", billingCadence: "MONTHLY", status: "ACTIVE",
  })

  useEffect(() => {
    if (!open) return
    setValues({
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      price: editing ? String(editing.price) : "",
      currency: editing?.currency ?? "USD",
      billingCadence: editing?.billingCadence ?? "MONTHLY",
      status: editing?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    })
  }, [open, editing])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>{editing ? "Update pricing or cadence." : "Add a product customers can subscribe to."}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(values) }}
          className="space-y-3"
        >
          <Field label="Name" htmlFor="prod-name" required>
            <Input id="prod-name" required value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
          </Field>
          <Field label="Description" htmlFor="prod-desc">
            <Textarea id="prod-desc" rows={2} value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price" htmlFor="prod-price" required>
              <Input id="prod-price" type="number" step="0.01" min="0" required value={values.price} onChange={(e) => setValues((v) => ({ ...v, price: e.target.value }))} />
            </Field>
            <Field label="Currency" htmlFor="prod-currency" required>
              <Input id="prod-currency" maxLength={3} required value={values.currency} onChange={(e) => setValues((v) => ({ ...v, currency: e.target.value.toUpperCase() }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cadence">
              <Select value={values.billingCadence} onValueChange={(v) => setValues((s) => ({ ...s, billingCadence: v as BillingCadence }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="ANNUALLY">Annual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={values.status} onValueChange={(v) => setValues((s) => ({ ...s, status: v as "ACTIVE" | "INACTIVE" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>{editing ? "Save changes" : "Create product"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PlanFormDialog({
  state,
  onClose,
  tenantId,
  onCreate,
  onUpdate,
  loading,
}: {
  state: PlanDialogState | null
  onClose: () => void
  tenantId: number
  onCreate: (customerId: number, values: PlanCreateValues) => void
  onUpdate: (customerId: number, cpId: number, values: PlanEditValues) => void
  loading: boolean
}) {
  const open = !!state
  const editing = state?.mode === "edit" ? state.target : null
  const isEdit = !!editing

  const [customerId, setCustomerId] = useState<number | null>(null)
  const [productId, setProductId] = useState<number | null>(null)
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [notes, setNotes] = useState("")

  const customersQ = useQuery({
    queryKey: ["plan-dialog-customers", tenantId],
    queryFn: () => customersApi.list(tenantId, 0, 100),
    enabled: open && !isEdit,
  })
  const productsQ = useQuery({
    queryKey: ["plan-dialog-products", tenantId],
    queryFn: () => productsApi.list(tenantId, 0, 100),
    enabled: open && !isEdit,
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      setCustomerId(editing.customerId)
      setProductId(editing.productId)
      setStartsAt(toLocalInput(editing.startsAt))
      setEndsAt(toLocalInput(editing.endsAt))
      setNotes(editing.notes ?? "")
    } else {
      setCustomerId(null)
      setProductId(null)
      setStartsAt("")
      setEndsAt("")
      setNotes("")
    }
  }, [open, editing])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEdit && editing) {
      onUpdate(editing.customerId, editing.id, { startsAt, endsAt, notes })
      return
    }
    if (!customerId || !productId) {
      toast.error("Pick a customer and a product")
      return
    }
    onCreate(customerId, { productId, startsAt, endsAt, notes })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit plan" : "New plan"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the schedule or notes. Use the pause/cancel buttons in the panel to change status."
              : "Assign a product to a customer to start billing."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isEdit && (
            <>
              <Field label="Customer" required>
                <Select
                  value={customerId ? String(customerId) : undefined}
                  onValueChange={(v) => setCustomerId(Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Pick a customer…" /></SelectTrigger>
                  <SelectContent>
                    {customersQ.data?.content.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name} · {c.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Product" required>
                <Select
                  value={productId ? String(productId) : undefined}
                  onValueChange={(v) => setProductId(Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Pick a product…" /></SelectTrigger>
                  <SelectContent>
                    {productsQ.data?.content.filter((p) => p.status === "ACTIVE").map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} · {p.currency} {p.price}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          {isEdit && editing && (
            <div className="rounded-md border border-border bg-card/40 px-3 py-2 text-xs text-muted-foreground">
              {editing.customerName} · {editing.productName}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" htmlFor="plan-starts">
              <Input id="plan-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </Field>
            <Field label="Ends" htmlFor="plan-ends">
              <Input id="plan-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </Field>
          </div>
          <Field label="Notes" htmlFor="plan-notes">
            <Textarea id="plan-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>{isEdit ? "Save changes" : "Create plan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  )
}
