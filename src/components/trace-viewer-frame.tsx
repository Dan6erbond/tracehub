import { traceViewerPath } from '#/lib/trace-viewer'
import { cn } from '#/lib/utils'
import type { Id } from '../../convex/_generated/dataModel'

/** Embeds the Playwright trace viewer for one trace; size it through `className`. */
export function TraceViewerFrame({
  repoId,
  traceId,
  className,
}: {
  repoId: Id<'repos'>
  traceId: Id<'traces'>
  className?: string
}) {
  return (
    <iframe
      title="Playwright trace viewer"
      src={traceViewerPath(repoId, traceId)}
      className={cn('size-full rounded-lg border bg-background', className)}
    />
  )
}
