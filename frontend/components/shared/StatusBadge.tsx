import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
  Archive,
  AlertCircle,
  Pause,
  Send,
  SkipForward,
  Ban,
} from "lucide-react"
import { titleCase } from "@/lib/utils"

type StatusBadgeVariant = React.ComponentProps<typeof Badge>["variant"]

interface Mapping {
  variant: StatusBadgeVariant
  Icon?: React.ComponentType<{ className?: string }>
}

const MAP: Record<string, Mapping> = {
  ACTIVE: { variant: "success", Icon: CheckCircle2 },
  PENDING: { variant: "warning", Icon: Clock },
  PAUSED: { variant: "info", Icon: PauseCircle },
  SUSPENDED: { variant: "warning", Icon: Pause },
  CANCELLED: { variant: "danger", Icon: XCircle },
  REVOKED: { variant: "danger", Icon: Ban },
  DISABLED: { variant: "danger", Icon: Ban },
  EXPIRED: { variant: "muted", Icon: Clock },
  ARCHIVED: { variant: "muted", Icon: Archive },
  DELETED: { variant: "muted", Icon: Archive },
  ACCEPTED: { variant: "success", Icon: CheckCircle2 },
  SENT: { variant: "success", Icon: Send },
  FAILED: { variant: "danger", Icon: AlertCircle },
  SKIPPED: { variant: "muted", Icon: SkipForward },
  INACTIVE: { variant: "muted", Icon: Pause },
}

export function StatusBadge({
  status,
  className,
}: {
  status?: string | null
  className?: string
}) {
  if (!status) return null
  const m = MAP[status] ?? { variant: "outline" as const }
  const Icon = m.Icon
  return (
    <Badge variant={m.variant} className={className}>
      {Icon && <Icon className="h-3 w-3" />}
      {titleCase(status)}
    </Badge>
  )
}
