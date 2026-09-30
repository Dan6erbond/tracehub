import { Link } from '@tanstack/react-router'
import { ChevronLeft, GitPullRequest } from 'lucide-react'
import { BranchBadge } from '#/components/branch-badge'
import { CiJobTable } from '#/components/ci-job-table'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { CommitLink } from '#/components/commit-link'
import { ExternalTextLink } from '#/components/external-text-link'
import { RunCard } from '#/components/run-card'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { usePipeline } from '#/hooks/use-ci-pipelines'
import { formatDuration } from '#/lib/format'
import { pipelineUrl } from '#/lib/git-host'
import type { Doc, Id } from '../../convex/_generated/dataModel'

export function PipelinePage({
  repo,
  pipelineId,
}: {
  repo: Doc<'repos'>
  pipelineId: Id<'ciPipelines'>
}) {
  const repoId = repo._id
  const { pipeline, loadingJobs, loadJobsError } = usePipeline(
    repoId,
    pipelineId,
  )

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/repos/$repoId/pipelines"
        params={{ repoId }}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Pipelines
      </Link>
      {pipeline.isPending && <Skeleton className="h-10 w-64" />}
      {pipeline.data === null && (
        <p className="text-muted-foreground">Pipeline not found.</p>
      )}
      {pipeline.data && (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{pipeline.data.name}</h2>
              <span className="text-muted-foreground">
                #{pipeline.data.externalId}
              </span>
              <CiStatusBadge status={pipeline.data.status} />
              <ExternalTextLink href={pipelineUrl(repo, pipeline.data)} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {pipeline.data.branch !== undefined && (
                <BranchBadge repoId={repoId} name={pipeline.data.branch} />
              )}
              {pipeline.data.prNumber !== undefined && (
                <Badge asChild variant="outline">
                  <Link
                    to="/repos/$repoId/pulls/$number"
                    params={{ repoId, number: pipeline.data.prNumber }}
                  >
                    <GitPullRequest />#{pipeline.data.prNumber}
                  </Link>
                </Badge>
              )}
              <CommitLink repo={repo} sha={pipeline.data.sha} />
              {pipeline.data.trigger && <span>{pipeline.data.trigger}</span>}
              <span>{new Date(pipeline.data.startedAt).toLocaleString()}</span>
              {pipeline.data.completedAt !== undefined && (
                <span>
                  {formatDuration(
                    pipeline.data.completedAt - pipeline.data.startedAt,
                  )}
                </span>
              )}
            </div>
            <TraceCountsBadges counts={pipeline.data.traceCounts} />
          </div>
          <h3 className="text-lg font-semibold">Jobs</h3>
          {loadingJobs && <Skeleton className="h-24 w-full" />}
          {pipeline.data.jobs.length > 0 && (
            <CiJobTable repo={repo} jobs={pipeline.data.jobs} />
          )}
          {loadJobsError && (
            <p className="text-destructive-foreground">
              Could not load the jobs from the Git host.
            </p>
          )}
          {!loadingJobs &&
            !loadJobsError &&
            pipeline.data.jobs.length === 0 && (
              <p className="text-muted-foreground">No jobs reported.</p>
            )}
          {pipeline.data.unlinkedRuns.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-semibold">Other trace runs</h3>
              {pipeline.data.unlinkedRuns.map((run) => (
                <RunCard key={run._id} run={run} repo={repo} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
