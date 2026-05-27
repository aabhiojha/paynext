"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft, Calendar, Package, Power, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { productsApi } from "@/lib/api/products"
import { friendlyError } from "@/lib/axios"
import { formatCurrency, formatDate, titleCase } from "@/lib/utils"
import { useRole } from "@/hooks/useRole"

export default function ProductDetailPage({
  params,
}: {
  params: { tenantId: string; productId: string }
}) {
  const tenantId = Number(params.tenantId)
  const productId = Number(params.productId)
  const router = useRouter()
  const qc = useQueryClient()
  const { isAtLeast } = useRole()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const product = useQuery({
    queryKey: ["products", tenantId, productId],
    queryFn: () => productsApi.get(tenantId, productId),
  })

  const toggle = useMutation({
    mutationFn: () =>
      productsApi.update(tenantId, productId, {
        status: product.data?.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", tenantId] })
      toast.success("Product status updated")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const del = useMutation({
    mutationFn: () => productsApi.delete(tenantId, productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", tenantId] })
      toast.success("Product deleted")
      router.push(`/${tenantId}/products`)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const p = product.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/${tenantId}/products`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Products
          </Link>
        }
        title={p?.name ?? "Loading…"}
        description={p?.description ?? undefined}
        actions={
          p &&
          isAtLeast("TENANT_USER") && (
            <>
              <Button
                variant="outline"
                onClick={() => toggle.mutate()}
                loading={toggle.isPending}
              >
                <Power className="h-4 w-4" />
                {p.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </Button>
              {isAtLeast("TENANT_ADMIN") && (
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </>
          )
        }
      />

      {!p && <Skeleton className="h-72" />}

      {p && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(280_85%_60%)] text-primary-foreground">
                <Package className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <CardTitle>{p.name}</CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={p.status} />
                  <span>· {titleCase(p.billingCadence)} billing</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Stat label="Price">
                  <span className="font-display text-2xl font-semibold tracking-tight">
                    {formatCurrency(p.price, p.currency)}
                  </span>
                </Stat>
                <Stat label="Currency">{p.currency}</Stat>
                <Stat label="Cadence">{titleCase(p.billingCadence)}</Stat>
                <Stat label="Created">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(p.createdAt)}
                  </span>
                </Stat>
              </dl>
              {p.description && (
                <div className="mt-6 rounded-xl border border-border bg-card/50 p-4 text-sm whitespace-pre-wrap">
                  {p.description}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Assign this product to customers from their detail page to
                start a billing cycle.
              </p>
              <p>
                Reminders run automatically based on the cadence you've
                configured.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this product?"
        description="You can only delete a product that isn't assigned to any active plan."
        confirmText="Delete product"
        destructive
        loading={del.isPending}
        onConfirm={() => del.mutate()}
      />
    </div>
  )
}

function Stat({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  )
}
