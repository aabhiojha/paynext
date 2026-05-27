import { Badge } from "@/components/ui/badge"
import { Crown, Shield, User } from "lucide-react"
import type { Role } from "@/types/api"

const MAP: Record<
  Role,
  { label: string; Icon: React.ComponentType<{ className?: string }>; variant: any }
> = {
  SUPER_ADMIN: { label: "Super admin", Icon: Crown, variant: "default" },
  TENANT_ADMIN: { label: "Admin", Icon: Shield, variant: "info" },
  TENANT_USER: { label: "Member", Icon: User, variant: "muted" },
}

export function RoleBadge({ role }: { role?: Role | string }) {
  if (!role) return null
  const m = MAP[role as Role] ?? { label: role, Icon: User, variant: "muted" }
  const { Icon } = m
  return (
    <Badge variant={m.variant}>
      <Icon className="h-3 w-3" />
      {m.label}
    </Badge>
  )
}
