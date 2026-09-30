import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChevronLeft, Download } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { TraceStatusBadge } from '#/components/trace-status-badge'
import { TraceViewerFrame } from '#/components/trace-viewer-frame'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { formatDuration } from '#/lib/format'
import { traceZipPath } from '#/lib/trace-viewer'
import type { Id } from '../../convex/_generated/dataModel'

export function TracePage({
  repoId,
  traceId,
}: {
  repoId: Id<'repos'>
  traceId: Id<'traces'>
}) {
  const trace = useQuery(convexQuery(api.traces.getTrace, { repoId, traceId }))

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-96 flex-col gap-4">
      {trace.isPending && <Skeleton className="h-10 w-64" />}
      {trace.data === null && (
        <p className="text-muted-foreground">Trace not found.</p>
      )}
      {trace.data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <Link
                to="/repos/$repoId/runs/$runId"
                params={{ repoId, runId: trace.data.runId }}
                className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                Run
              </Link>
              <h2 className="truncate text-lg font-semibold">
                {trace.data.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <TraceStatusBadge status={trace.data.status} />
              {trace.data.durationMs !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {formatDuration(trace.data.durationMs)}
                </span>
              )}
              <Button asChild variant="outline" size="sm">
                <a
                  href={traceZipPath(repoId, traceId)}
                  download={trace.data.fileName}
                >
                  <Download />
                  Download
                </a>
              </Button>
            </div>
          </div>
          <TraceViewerFrame
            repoId={repoId}
            traceId={traceId}
            className="min-h-0 flex-1"
          />
        </>
      )}
    </div>
  )
}
