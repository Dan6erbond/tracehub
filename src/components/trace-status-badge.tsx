import {
  CircleCheck,
  CircleHelp,
  CircleSlash,
  CircleX,
  Clock,
  OctagonX,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { traceStatusSchema } from '#/lib/schemas/trace'
import type { TraceStatus } from '#/lib/schemas/trace'

const FAILING =
  'border-destructive-foreground/30 bg-destructive-foreground/10 text-destructive-foreground'
const INACTIVE = 'border-border bg-muted text-muted-foreground'

export const TRACE_STATUS_DISPLAY = {
  passed: {
    label: 'Passed',
    Icon: CircleCheck,
    className: 'border-success/30 bg-success/10 text-success',
  },
  failed: { label: 'Failed', Icon: CircleX, className: FAILING },
  timedOut: { label: 'Timed out', Icon: Clock, className: FAILING },
  interrupted: { label: 'Interrupted', Icon: OctagonX, className: FAILING },
  skipped: { label: 'Skipped', Icon: CircleSlash, className: INACTIVE },
  unknown: { label: 'Unknown', Icon: CircleHelp, className: INACTIVE },
} as const satisfies Record<
  TraceStatus,
  { label: string; Icon: unknown; className: string }
>

export const TRACE_STATUS_OPTIONS = traceStatusSchema.options.map((value) => ({
  value,
  label: TRACE_STATUS_DISPLAY[value].label,
}))

export function TraceStatusBadge({
  status,
  count,
}: {
  status: TraceStatus
  count?: number
}) {
  const { label, Icon, className } = TRACE_STATUS_DISPLAY[status]
  return (
    <Badge variant="outline" className={className}>
      <Icon />
      {count === undefined ? label : `${count} ${label.toLowerCase()}`}
    </Badge>
  )
}
