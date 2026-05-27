"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ScrollText,
  FilePlus2,
  FileEdit,
  FileMinus,
  RefreshCcw,
  LogIn,
  LogOut,
  AlertTriangle,
} from "lucide-react"

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
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { auditApi, type AuditFilter } from "@/lib/api/audit"
import { formatDateTime, titleCase } from "@/lib/utils"
import { useRole } from "@/hooks/useRole"

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  CREATE: FilePlus2,
  UPDATE: FileEdit,
  DELETE: FileMinus,
  STATUS_CHANGE: RefreshCcw,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  LOGIN_FAILED: AlertTriangle,
}

const ACTION_VARIANT: Record<
  string,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  STATUS_CHANGE: "warning",
  LOGIN: "muted",
  LOGOUT: "muted",
  LOGIN_FAILED: "danger",
}

const ACTIONS: AuditFilter["action"][] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
  "LOGIN",
  "LOGOUT",
  "LOGIN_FAILED",
]

export default function AuditLogsPage() {
  const router = useRouter()
  const { isSuperAdmin } = useRole()
  const [page, setPage] = useState(0)
  const [size] = useState(25)
  const [action, setAction] = useState<string>("ALL")

  useEffect(() => {
    if (!isSuperAdmin) router.replace("/dashboard")
  }, [isSuperAdmin, router])

  const filter: AuditFilter = action !== "ALL" ? { action: action as any } : {}

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, size, action],
    queryFn: () => auditApi.list(page, size, filter),
    enabled: isSuperAdmin,
  })

  if (!isSuperAdmin) return null

  const rows = data?.content ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Timestamped record of every change made across the platform."
        actions={
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a!}>
                  {titleCase(a!)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Card>
        {isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit events yet"
            description="Actions taken across the platform will be recorded here for compliance."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => {
                  const Icon = ACTION_ICON[a.action] ?? FileEdit
                  const variant = ACTION_VARIANT[a.action] ?? "muted"
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(a.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">{a.actorEmail}</TableCell>
                      <TableCell>
                        <Badge variant={variant}>
                          <Icon className="h-3 w-3" />
                          {titleCase(a.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {titleCase(a.resourceType)}{" "}
                        {a.resourceId != null && (
                          <span className="text-xs text-muted-foreground">
                            #{a.resourceId}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        {a.newValue || a.oldValue ? (
                          <details className="group text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View change
                            </summary>
                            <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-secondary/40 p-2 text-[11px] leading-relaxed text-foreground scrollbar-thin">
                              {a.oldValue && `- ${a.oldValue}\n`}
                              {a.newValue && `+ ${a.newValue}`}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
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
