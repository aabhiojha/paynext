"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Package, Plus } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"

import { productsApi } from "@/lib/api/products"
import { formatCurrency, titleCase } from "@/lib/utils"

const CADENCE_LABEL: Record<string, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annual",
}

export default function ProductsPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const [page] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["products", tenantId, page, 50],
    queryFn: () => productsApi.list(tenantId, page, 50),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="The catalog of subscription offerings you bill customers for."
        actions={
          <Button asChild>
            <Link href={`/${tenantId}/products/new`}>
              <Plus className="h-4 w-4" /> New product
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : data && data.content.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add a product to start building plans and reminders around it."
            action={
              <Button asChild>
                <Link href={`/${tenantId}/products/new`}>
                  <Plus className="h-4 w-4" /> New product
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.content.map((p) => (
            <Link
              key={p.id}
              href={`/${tenantId}/products/${p.id}`}
              className="group block"
            >
              <Card className="relative h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-pop">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-[hsl(280_85%_60%)] opacity-80" />
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-semibold tracking-tight">
                        {p.name}
                      </p>
                      <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
                        {CADENCE_LABEL[p.billingCadence] ?? titleCase(p.billingCadence)}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <div className="flex items-end justify-between pt-2">
                    <div>
                      <p className="font-display text-2xl font-semibold tracking-tight">
                        {formatCurrency(p.price, p.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        per {p.billingCadence.toLowerCase().replace("ly", "")}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      View →
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
