"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Building2, Plus } from "lucide-react"

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
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/shared/SearchInput"

import { tenantsApi } from "@/lib/api/tenants"
import { useRole } from "@/hooks/useRole"
import { formatDate, initials } from "@/lib/utils"

export default function TenantsPage() {
  const router = useRouter()
  const { isSuperAdmin } = useRole()
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [q, setQ] = useState("")

  useEffect(() => {
    if (!isSuperAdmin) router.replace("/dashboard")
  }, [isSuperAdmin, router])

  const { data, isLoading } = useQuery({
    queryKey: ["tenants", page, size],
    queryFn: () => tenantsApi.list(page, size),
    enabled: isSuperAdmin,
  })

  const rows = (data?.content ?? []).filter((t) =>
    q ? t.name.toLowerCase().includes(q.toLowerCase()) : true
  )

  if (!isSuperAdmin) return null

  return (
    <>
      {/* Desktop: sidebar handles browsing, show a landing prompt */}
      <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(280_85%_60%)] text-primary-foreground">
          <Building2 className="h-6 w-6" />
        </div>
        <h2 className="mt-5 font-display text-xl font-semibold tracking-tight">
          Select a tenant
        </h2>
        <p className="mt-1.5 max-w-xs text-center text-sm text-muted-foreground">
          Pick an organisation from the sidebar to view its details, or create a
          new one.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/tenants/new">
            <Plus className="h-4 w-4" /> New tenant
          </Link>
        </Button>
      </div>

      {/* Mobile / tablet: full table since sidebar is hidden */}
      <div className="space-y-6 lg:hidden">
        <div className="flex items-end justify-between border-b border-border pb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Tenants
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every organisation on the platform.
            </p>
          </div>
          <Button asChild>
            <Link href="/tenants/new">
              <Plus className="h-4 w-4" /> New tenant
            </Link>
          </Button>
        </div>

        <Card>
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name…"
            />
            <p className="text-xs text-muted-foreground">
              {data?.totalElements ?? 0} total
            </p>
          </div>
          {isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No tenants yet"
              description="Create your first tenant to start onboarding customers."
              action={
                <Button asChild>
                  <Link href="/tenants/new">
                    <Plus className="h-4 w-4" /> New tenant
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Timezone
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          href={`/tenants/${t.id}`}
                          className="flex items-center gap-3"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{initials(t.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{t.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {t.slug}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.companyEmail}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {t.timezone}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {formatDate(t.createdAt)}
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
    </>
  )
}
