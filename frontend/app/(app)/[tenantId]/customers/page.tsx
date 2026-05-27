"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Plus, UserCircle2, Mail, Phone } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SearchInput } from "@/components/shared/SearchInput"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"

import { customersApi } from "@/lib/api/customers"
import { formatDate, initials } from "@/lib/utils"

export default function CustomersPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [q, setQ] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["customers", tenantId, page, size],
    queryFn: () => customersApi.list(tenantId, page, size),
  })

  const rows = useMemo(() => {
    const list = data?.content ?? []
    if (!q) return list
    const needle = q.toLowerCase()
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.email.toLowerCase().includes(needle)
    )
  }, [data, q])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage the people and organisations being billed in this workspace."
        actions={
          <Button asChild>
            <Link href={`/${tenantId}/customers/new`}>
              <Plus className="h-4 w-4" />
              New customer
            </Link>
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
          />
          <p className="text-xs text-muted-foreground">
            {data?.totalElements ?? 0} total
          </p>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UserCircle2}
            title="No customers yet"
            description="Add your first customer to start assigning plans and sending reminders."
            action={
              <Button asChild>
                <Link href={`/${tenantId}/customers/new`}>
                  <Plus className="h-4 w-4" /> New customer
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/${tenantId}/customers/${c.id}`}
                        className="flex items-center gap-3 hover:opacity-90"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{initials(c.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {c.name}
                          </p>
                          {c.address && (
                            <p className="text-xs text-muted-foreground">
                              {c.address}
                            </p>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          {c.email}
                        </div>
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${tenantId}/customers/${c.id}`}>
                          View
                        </Link>
                      </Button>
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
