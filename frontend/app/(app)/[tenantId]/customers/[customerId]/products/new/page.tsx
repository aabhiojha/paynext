"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { productsApi } from "@/lib/api/products"
import { plansApi } from "@/lib/api/plans"
import { customersApi } from "@/lib/api/customers"
import { friendlyError } from "@/lib/axios"
import { formatCurrency } from "@/lib/utils"

const schema = z.object({
  productId: z.coerce.number().int().positive(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  notes: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function AssignProductPage({
  params,
}: {
  params: { tenantId: string; customerId: string }
}) {
  const tenantId = Number(params.tenantId)
  const customerId = Number(params.customerId)
  const router = useRouter()
  const qc = useQueryClient()

  const customer = useQuery({
    queryKey: ["customers", tenantId, customerId],
    queryFn: () => customersApi.get(tenantId, customerId),
  })
  const products = useQuery({
    queryKey: ["products", tenantId, 0, 100],
    queryFn: () => productsApi.list(tenantId, 0, 100),
  })

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { productId: undefined, startsAt: "", endsAt: "", notes: "" },
  })

  const mut = useMutation({
    mutationFn: (data: Values) =>
      plansApi.assign(tenantId, customerId, {
        productId: data.productId,
        startsAt: data.startsAt
          ? new Date(data.startsAt).toISOString()
          : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : undefined,
        notes: data.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["customers", tenantId, customerId, "products"],
      })
      qc.invalidateQueries({ queryKey: ["plans", tenantId] })
      toast.success("Plan assigned")
      router.push(`/${tenantId}/customers/${customerId}`)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const active = products.data?.content?.filter((p) => p.status === "ACTIVE") ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/${tenantId}/customers/${customerId}`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />{" "}
            {customer.data?.name ?? "Customer"}
          </Link>
        }
        title="Assign a product"
        description="Activate a subscription plan for this customer."
      />

      <form
        onSubmit={form.handleSubmit((v) => mut.mutate(v))}
        className="grid gap-6 lg:grid-cols-[2fr_1fr]"
      >
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="productId">Product</Label>
              <Select
                onValueChange={(v) => form.setValue("productId", Number(v))}
              >
                <SelectTrigger id="productId">
                  <SelectValue placeholder="Choose a product…" />
                </SelectTrigger>
                <SelectContent>
                  {active.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ·{" "}
                      {formatCurrency(p.price, p.currency)} ·{" "}
                      {p.billingCadence.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.productId && (
                <p className="text-xs text-destructive">
                  Please select a product.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Starts at</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  {...form.register("startsAt")}
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to now if omitted.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Ends at</Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  {...form.register("endsAt")}
                />
                <p className="text-xs text-muted-foreground">
                  Optional — leave blank for open-ended.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Internal notes about this assignment…"
                {...form.register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-2 p-6 text-sm">
              <p className="font-medium">Heads up</p>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Each customer can hold one ACTIVE assignment per product.</li>
                <li>• You can pause or cancel later from the customer view.</li>
              </ul>
            </CardContent>
          </Card>
          <Button type="submit" loading={mut.isPending} className="w-full">
            Assign product
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
