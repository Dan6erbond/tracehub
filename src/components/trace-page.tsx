import { Download } from 'lucide-react'
import { BackLink } from '#/components/back-link'
import { PageHeader } from '#/components/page-header'
import { QueryState } from '#/components/query-state'
import { TraceStatusBadge } from '#/components/trace-status-badge'
import { TraceViewerFrame } from '#/components/trace-viewer-frame'
import { Button } from '#/components/ui/button'
import { useRun } from '#/hooks/use-runs'
import { useTrace } from '#/hooks/use-traces'
import { formatDuration } from '#/lib/format'
import { traceZipPath } from '#/lib/trace-viewer'
import { runName } from '#/lib/run-name'
import type { Id } from '../../convex/_generated/dataModel'

function RunBackLink({
  repoId,
  runId,
}: {
  repoId: Id<'repos'>
  runId: Id<'runs'>
}) {
  const run = useRun(repoId, runId)
  return (
    <BackLink to="/repos/$repoId/runs/$runId" params={{ repoId, runId }}>
      {run.data ? runName(run.data) : 'Run'}
    </BackLink>
  )
}

/** Fills the height of the main area, which is a flex column, so the viewer takes whatever the header leaves. */
export function TracePage({
  repoId,
  traceId,
}: {
  repoId: Id<'repos'>
  traceId: Id<'traces'>
}) {
  const traceQuery = useTrace(repoId, traceId)

  return (
    <div className="flex min-h-96 flex-1 flex-col gap-4">
      <QueryState query={traceQuery} notFound="Trace not found.">
        {(trace) => (
          <>
            <RunBackLink repoId={repoId} runId={trace.runId} />
            <PageHeader
              compact
              title={trace.title}
              badges={
                <>
                  <TraceStatusBadge status={trace.status} />
                  {trace.durationMs !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(trace.durationMs)}
                    </span>
                  )}
                </>
              }
              actions={
                <Button asChild variant="outline" size="sm">
                  <a
                    href={traceZipPath(repoId, traceId)}
                    download={trace.fileName}
                  >
                    <Download />
                    Download
                  </a>
                </Button>
              }
            />
            <TraceViewerFrame
              repoId={repoId}
              traceId={traceId}
              className="min-h-0 flex-1"
            />
          </>
        )}
      </QueryState>
    </div>
  )
}
