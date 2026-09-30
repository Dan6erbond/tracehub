import { Link } from '@tanstack/react-router'
import {
  ChevronLeft,
  ExternalLink,
  GitPullRequest,
  Pin,
  PinOff,
} from 'lucide-react'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { CommitLink } from '#/components/commit-link'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import { TraceTable } from '#/components/trace-table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { UploadTracesButton } from '#/components/upload-traces-button'
import { useRun, useSetRunPinned, useTraces } from '#/hooks/use-runs'
import { runName } from '#/lib/run-name'
import type { Doc, Id } from '../../convex/_generated/dataModel'

export function RunPage({
  repo,
  runId,
}: {
  repo: Doc<'repos'>
  runId: Id<'runs'>
}) {
  const repoId = repo._id
  const run = useRun(repoId, runId)
  const traces = useTraces(repoId, runId)
  const setPinned = useSetRunPinned()
  const pinned = run.data?.pinnedAt !== undefined

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/repos/$repoId"
        params={{ repoId }}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Branches
      </Link>
      {run.isPending && <Skeleton className="h-10 w-64" />}
      {run.data === null && (
        <p className="text-muted-foreground">Run not found.</p>
      )}
      {run.data && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{runName(run.data)}</h2>
                {run.data.prNumber !== undefined && (
                  <Badge asChild variant="outline">
                    <Link
                      to="/repos/$repoId/pulls/$number"
                      params={{ repoId, number: run.data.prNumber }}
                    >
                      <GitPullRequest />#{run.data.prNumber}
                    </Link>
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                <CommitLink repo={repo} sha={run.data.sha} /> ·{' '}
                {new Date(run.data._creationTime).toLocaleString()}
              </p>
              {run.data.job && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">CI job</span>
                  <span>{run.data.job.name}</span>
                  <CiStatusBadge status={run.data.job.status} />
                </div>
              )}
              {run.data.description && <p>{run.data.description}</p>}
              <TraceCountsBadges counts={run.data.traceCounts} />
            </div>
            <div className="flex gap-2">
              {run.data.ciUrl && (
                <Button asChild variant="outline">
                  <a href={run.data.ciUrl} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    Pipeline
                  </a>
                </Button>
              )}
              {run.data.prNumber !== undefined && (
                <Button
                  variant="outline"
                  disabled={setPinned.isPending}
                  onClick={() =>
                    setPinned.mutate({
                      repoId,
                      runId,
                      pinned: !pinned,
                    })
                  }
                >
                  {pinned ? <PinOff /> : <Pin />}
                  {pinned ? 'Unpin' : 'Pin'}
                </Button>
              )}
              <UploadTracesButton repoId={repoId} target={{ job: runId }} />
            </div>
          </div>
          {traces.isPending && <Skeleton className="h-32 w-full" />}
          {traces.data && <TraceTable traces={traces.data} />}
        </>
      )}
    </div>
  )
}
