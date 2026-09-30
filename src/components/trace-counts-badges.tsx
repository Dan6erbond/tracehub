import { TraceStatusBadge } from '#/components/trace-status-badge'
import { traceStatusSchema } from '#/lib/schemas/trace'
import type { TraceCounts } from '#/lib/schemas/trace'

/** One badge per status that has traces. */
export function TraceCountsBadges({ counts }: { counts: TraceCounts }) {
  if (counts.total === 0)
    return <span className="text-sm text-muted-foreground">No traces</span>
  return (
    <div className="flex flex-wrap gap-2">
      {traceStatusSchema.options
        .filter((status) => counts.byStatus[status] > 0)
        .map((status) => (
          <TraceStatusBadge
            key={status}
            status={status}
            count={counts.byStatus[status]}
          />
        ))}
    </div>
  )
}
