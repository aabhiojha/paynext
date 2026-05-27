"use client"

import { useQuery } from "@tanstack/react-query"
import { Mail, Calendar, ShieldCheck } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { Button } from "@/components/ui/button"

import { authApi } from "@/lib/api/auth"
import { useAuth } from "@/hooks/useAuth"
import { formatDate, initials } from "@/lib/utils"

export default function MePage() {
  const { logout } = useAuth()
  const me = useQuery({ queryKey: ["me"], queryFn: authApi.me })

  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Your account information and role within this workspace."
        actions={
          <Button variant="outline" onClick={() => logout()}>
            Log out
          </Button>
        }
      />

      {me.isLoading && <Skeleton className="h-60" />}

      {me.data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-base">
                  {initials(me.data.email)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <CardTitle>{me.data.email}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={me.data.role as any} />
                  <StatusBadge status={me.data.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Email" icon={Mail}>
                  {me.data.email}
                </Item>
                <Item label="Role" icon={ShieldCheck}>
                  {me.data.role}
                </Item>
                <Item label="Joined" icon={Calendar}>
                  {formatDate(me.data.createdAt)}
                </Item>
                <Item label="Last updated" icon={Calendar}>
                  {formatDate(me.data.updatedAt)}
                </Item>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Need to change your password or remove access? Contact your
                workspace admin.
              </p>
              <p>
                Sessions are protected by short-lived tokens that auto-refresh
                while you're active.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
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
