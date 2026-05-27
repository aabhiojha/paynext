"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Archive, ArrowLeft, Building2, Globe, Mail, PauseOctagon } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { tenantsApi } from "@/lib/api/tenants"
import { friendlyError } from "@/lib/axios"
import { formatDate } from "@/lib/utils"

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/tenants"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Tenants
          </Link>
        }
        title={t?.name ?? "Loading…"}
        description={t?.slug}
        actions={
          t && (
            <>
              {t.status === "ACTIVE" && (
                <Button variant="outline" onClick={() => setConfirmSuspend(true)}>
                  <PauseOctagon className="h-4 w-4" /> Suspend
                </Button>
              )}
              {t.status !== "ARCHIVED" && (
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setConfirmArchive(true)}
                >
                  <Archive className="h-4 w-4" /> Archive
                </Button>
              )}
            </>
          )
        }
      />

      {!t && <Skeleton className="h-60" />}

      {t && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(280_85%_60%)] text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <CardTitle>{t.name}</CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <StatusBadge status={t.status} />
                  <span className="text-muted-foreground">· {t.slug}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Company email" icon={Mail}>
                  {t.companyEmail}
                </Item>
                <Item label="Timezone" icon={Globe}>
                  {t.timezone}
                </Item>
                <Item label="Created">{formatDate(t.createdAt)}</Item>
                <Item label="Updated">{formatDate(t.updatedAt)}</Item>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/${tenantId}/customers`}>Customers</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/${tenantId}/products`}>Products</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/${tenantId}/users`}>Team</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/${tenantId}/audit-logs`}>Audit log</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
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

function Item({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </p>
      <p className="mt-1.5 text-sm">{children}</p>
    </div>
  )
}
