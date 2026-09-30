import { CircleCheck, CircleDashed, CircleX, LoaderCircle } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import type { CiStatus } from '#/lib/schemas/ci-status'

const CI_STATUS_DISPLAY = {
  success: {
    label: 'Passing',
    Icon: CircleCheck,
    className: 'border-success/30 bg-success/10 text-success',
  },
  failure: {
    label: 'Failing',
    Icon: CircleX,
    className:
      'border-destructive-foreground/30 bg-destructive-foreground/10 text-destructive-foreground',
  },
  pending: {
    label: 'Running',
    Icon: LoaderCircle,
    className:
      'border-warning/30 bg-warning/10 text-warning [&>svg]:animate-spin',
  },
  unknown: {
    label: 'Unknown',
    Icon: CircleDashed,
    className: 'text-muted-foreground',
  },
} as const

/** Without a status, the host has not reported the pipeline or job yet. */
export function CiStatusBadge({ status }: { status?: CiStatus }) {
  const { label, Icon, className } = CI_STATUS_DISPLAY[status ?? 'unknown']
  return (
    <Badge variant="outline" className={className}>
      <Icon />
      {label}
    </Badge>
  )
}
