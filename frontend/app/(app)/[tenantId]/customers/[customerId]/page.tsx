"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  Plus,
  StickyNote,
  Trash2,
  MoreHorizontal,
  PauseCircle,
  Play,
  Ban,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { customersApi } from "@/lib/api/customers"
import { plansApi } from "@/lib/api/plans"
import { friendlyError } from "@/lib/axios"
import { formatDate, initials } from "@/lib/utils"
import { useRole } from "@/hooks/useRole"

export default function CustomerDetailPage({
  params,
}: {
  params: { tenantId: string; customerId: string }
}) {
  const tenantId = Number(params.tenantId)
  const customerId = Number(params.customerId)
  const router = useRouter()
  const qc = useQueryClient()
  const { isAtLeast } = useRole()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const customer = useQuery({
    queryKey: ["customers", tenantId, customerId],
    queryFn: () => customersApi.get(tenantId, customerId),
  })
  const plans = useQuery({
    queryKey: ["customers", tenantId, customerId, "products"],
    queryFn: () => plansApi.listForCustomer(tenantId, customerId, 0, 50),
  })

  const del = useMutation({
    mutationFn: () => customersApi.delete(tenantId, customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", tenantId] })
      toast.success("Customer deleted")
      router.push(`/${tenantId}/customers`)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const statusMut = useMutation({
    mutationFn: ({
      cpId,
      status,
    }: {
      cpId: number
      status: "ACTIVE" | "PAUSED" | "CANCELLED"
    }) => plansApi.setStatus(tenantId, customerId, cpId, status),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["customers", tenantId, customerId, "products"],
      })
      toast.success("Plan updated")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const c = customer.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/${tenantId}/customers`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Customers
          </Link>
        }
        title={c?.name ?? "Loading…"}
        description={c?.email}
        actions={
          c && (
            <>
              <Button variant="outline" asChild>
                <Link
                  href={`/${tenantId}/customers/${customerId}/products/new`}
                >
                  <Plus className="h-4 w-4" />
                  Assign product
                </Link>
              </Button>
              {isAtLeast("TENANT_ADMIN") && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </>
          )
        }
      />

      {!c && <CustomerDetailSkeleton />}

      {c && (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader className="flex-row items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-base">
                  {initials(c.name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <CardTitle>{c.name}</CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <StatusBadge status={c.status} />
                  <span>· Added {formatDate(c.createdAt)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card/50 p-4">
                  <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </dt>
                  <dd className="mt-1.5 text-sm">{c.email}</dd>
                </div>
                <div className="rounded-xl border border-border bg-card/50 p-4">
                  <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </dt>
                  <dd className="mt-1.5 text-sm">{c.phone || "—"}</dd>
                </div>
                <div className="rounded-xl border border-border bg-card/50 p-4 sm:col-span-2">
                  <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Address
                  </dt>
                  <dd className="mt-1.5 text-sm">{c.address || "—"}</dd>
                </div>
                {c.notes && (
                  <div className="rounded-xl border border-border bg-card/50 p-4 sm:col-span-2">
                    <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <StickyNote className="h-3.5 w-3.5" /> Notes
                    </dt>
                    <dd className="mt-1.5 text-sm whitespace-pre-wrap">
                      {c.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total plans</span>
                  <span className="font-medium">
                    {plans.data?.totalElements ?? 0}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active</span>
                  <span className="font-medium">
                    {plans.data?.content?.filter((p) => p.status === "ACTIVE")
                      .length ?? 0}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paused</span>
                  <span className="font-medium">
                    {plans.data?.content?.filter((p) => p.status === "PAUSED")
                      .length ?? 0}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cancelled</span>
                  <span className="font-medium">
                    {plans.data?.content?.filter(
                      (p) => p.status === "CANCELLED"
                    ).length ?? 0}
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {c && (
      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Assigned plans</TabsTrigger>
        </TabsList>
        <TabsContent value="plans">
          <Card>
            {plans.isLoading ? (
              <TableSkeleton rows={4} cols={4} />
            ) : plans.data && plans.data.content.length === 0 ? (
              <EmptyState
                icon={Plus}
                title="No plans assigned"
                description="Assign a product to start tracking this customer's subscription."
                action={
                  <Button asChild>
                    <Link
                      href={`/${tenantId}/customers/${customerId}/products/new`}
                    >
                      <Plus className="h-4 w-4" /> Assign product
                    </Link>
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.data?.content?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{p.productName}</p>
                        {p.notes && (
                          <p className="text-xs text-muted-foreground">
                            {p.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(p.startsAt)} → {formatDate(p.endsAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {p.status === "ACTIVE" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMut.mutate({
                                    cpId: p.id,
                                    status: "PAUSED",
                                  })
                                }
                              >
                                <PauseCircle className="h-4 w-4" /> Pause
                              </DropdownMenuItem>
                            )}
                            {p.status === "PAUSED" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  statusMut.mutate({
                                    cpId: p.id,
                                    status: "ACTIVE",
                                  })
                                }
                              >
                                <Play className="h-4 w-4" /> Resume
                              </DropdownMenuItem>
                            )}
                            {p.status !== "CANCELLED" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  destructive
                                  onClick={() =>
                                    statusMut.mutate({
                                      cpId: p.id,
                                      status: "CANCELLED",
                                    })
                                  }
                                >
                                  <Ban className="h-4 w-4" /> Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this customer?"
        description="This permanently removes the customer. Plans must be cancelled first."
        confirmText="Delete customer"
        destructive
        loading={del.isPending}
        onConfirm={() => del.mutate()}
      />
    </div>
  )
}

function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Info card + summary skeleton */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card/50 p-4"
                >
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-2 h-4 w-40" />
                </div>
              ))}
              <div className="rounded-xl border border-border bg-card/50 p-4 sm:col-span-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-4 w-60" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-8" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Assigned plans table skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-9 w-40 rounded-md" />
        <Card>
          <TableSkeleton rows={4} cols={4} />
        </Card>
      </div>
    </div>
  )
}
