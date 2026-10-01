import { BackLink } from '#/components/back-link'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { CommitTimestamp } from '#/components/commit-timestamp'
import { ExternalTextLink } from '#/components/external-text-link'
import { PageHeader } from '#/components/page-header'
import { RunList } from '#/components/run-list'
import { SectionHeading } from '#/components/section-heading'
import { useJob } from '#/hooks/use-ci-jobs'
import { useJobRuns } from '#/hooks/use-runs'
import { formatElapsed } from '#/lib/format'
import { jobUrl } from '#/lib/git-host'
import type { Doc, Id } from '../../convex/_generated/dataModel'

export function JobPage({
  repo,
  jobId,
}: {
  repo: Doc<'repos'>
  jobId: Id<'ciJobs'>
}) {
  const repoId = repo._id
  const { job, pipeline } = useJob(repoId, jobId)
  const runs = useJobRuns(repoId, jobId)
  const elapsed = formatElapsed(job.startedAt, job.completedAt)

  return (
    <div className="flex flex-col gap-4">
      {pipeline ? (
        <BackLink
          to="/repos/$repoId/pipelines/$pipelineId"
          params={{ repoId, pipelineId: pipeline._id }}
        >
          {pipeline.name} #{pipeline.externalId}
        </BackLink>
      ) : (
        <BackLink to="/repos/$repoId/pipelines" params={{ repoId }}>
          Pipelines
        </BackLink>
      )}
      <PageHeader
        title={job.name}
        badges={
          <>
            <CiStatusBadge status={job.status} />
            <ExternalTextLink href={jobUrl(repo, job)} />
          </>
        }
        meta={
          <>
            <CommitTimestamp
              repo={repo}
              sha={job.sha}
              timestamp={job.startedAt}
            />
            {elapsed && <span>{elapsed}</span>}
          </>
        }
      />
      <SectionHeading>Trace runs ({job.runCount})</SectionHeading>
      <RunList repo={repo} query={runs} />
    </div>
  )
}
