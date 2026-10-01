import { BackLink } from '#/components/back-link'
import { BranchBadge } from '#/components/branch-badge'
import { CiJobTable } from '#/components/ci-job-table'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { CommitTimestamp } from '#/components/commit-timestamp'
import { ErrorAlert } from '#/components/error-alert'
import { ExternalTextLink } from '#/components/external-text-link'
import { PageHeader } from '#/components/page-header'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { RunCard } from '#/components/run-card'
import { SectionHeading } from '#/components/section-heading'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import { Skeleton } from '#/components/ui/skeleton'
import { usePipeline } from '#/hooks/use-ci-pipelines'
import { formatElapsed } from '#/lib/format'
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
  const elapsed = formatElapsed(pipeline.startedAt, pipeline.completedAt)

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/repos/$repoId/pipelines" params={{ repoId }}>
        Pipelines
      </BackLink>
      <PageHeader
        title={pipeline.name}
        badges={
          <>
            <span className="text-muted-foreground">
              #{pipeline.externalId}
            </span>
            <CiStatusBadge status={pipeline.status} />
            <ExternalTextLink href={pipelineUrl(repo, pipeline)} />
          </>
        }
        meta={
          <>
            {pipeline.branch !== undefined && (
              <BranchBadge repoId={repoId} name={pipeline.branch} />
            )}
            {pipeline.prNumber !== undefined && (
              <PullRequestBadge
                pullRequest={{ number: pipeline.prNumber }}
                repoId={repoId}
              />
            )}
            <CommitTimestamp
              repo={repo}
              sha={pipeline.sha}
              timestamp={pipeline.startedAt}
            />
            {pipeline.trigger && <span>{pipeline.trigger}</span>}
            {elapsed && <span>{elapsed}</span>}
          </>
        }
      >
        <TraceCountsBadges counts={pipeline.traceCounts} />
      </PageHeader>
      <SectionHeading>Jobs</SectionHeading>
      {loadingJobs && <Skeleton className="h-24 w-full" />}
      {pipeline.jobs.length > 0 && (
        <CiJobTable repo={repo} jobs={pipeline.jobs} />
      )}
      <ErrorAlert error={loadJobsError}>
        Could not load the jobs from the Git host.
      </ErrorAlert>
      {!loadingJobs && !loadJobsError && pipeline.jobs.length === 0 && (
        <p className="text-muted-foreground">No jobs reported.</p>
      )}
      {pipeline.unlinkedRuns.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionHeading>Other trace runs</SectionHeading>
          {pipeline.unlinkedRuns.map((run) => (
            <RunCard key={run._id} run={run} repo={repo} />
          ))}
        </div>
      )}
    </div>
  )
}
