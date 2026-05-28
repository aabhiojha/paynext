"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Bell, Zap } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { remindersApi } from "@/lib/api/reminders"
import { formatDateTime } from "@/lib/utils"
import { friendlyError } from "@/lib/axios"

export default function RemindersPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [filter, setFilter] = useState<string>("ALL")

  const { data, isLoading } = useQuery({
    queryKey: ["reminders", tenantId, page, size],
    queryFn: () => remindersApi.list(tenantId, page, size),
  })

  const rows =
    filter === "ALL"
      ? data?.content ?? []
      : (data?.content ?? []).filter((r) => r.status === filter)

  const trigger = useMutation({
    mutationFn: () => remindersApi.trigger(tenantId),
    onSuccess: (rs) => {
      qc.invalidateQueries({ queryKey: ["reminders", tenantId] })
      toast.success(`Processed ${rs.length} reminder${rs.length === 1 ? "" : "s"}`)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        description="Outbound reminder dispatches across this workspace."
        actions={
          <>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="SKIPPED">Skipped</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => trigger.mutate()}
              loading={trigger.isPending}
            >
              <Zap className="h-4 w-4" /> Trigger now
            </Button>
          </>
        }
      />

      <Card>
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No reminders yet"
            description="Run a dispatch manually or wait for the scheduled batch to fire."
            action={
              <Button
                onClick={() => trigger.mutate()}
                loading={trigger.isPending}
              >
                <Zap className="h-4 w-4" /> Trigger reminders
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/${tenantId}/customers/${r.customerId}`}
                        className="font-medium hover:underline"
                      >
                        {r.customerName}
                      </Link>
                    </TableCell>
                    <TableCell>{r.productName}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(r.sentAt)}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                      {r.errorMessage ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border">
              <Pagination
                page={page}
                totalPages={data?.totalPages ?? 0}
                totalElements={data?.totalElements}
                pageSize={size}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
