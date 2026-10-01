import { BackLink } from '#/components/back-link'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { CommitTimestamp } from '#/components/commit-timestamp'
import { ExternalTextLink } from '#/components/external-text-link'
import { PageHeader } from '#/components/page-header'
import { QueryState } from '#/components/query-state'
import { RunCard } from '#/components/run-card'
import { SectionHeading } from '#/components/section-heading'
import { useJob } from '#/hooks/use-ci-pipelines'
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
  const result = useJob(repoId, jobId)
  const pipeline = result.data?.pipeline

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
      <QueryState query={result} notFound="Job not found.">
        {({ job }) => {
          const elapsed = formatElapsed(job.startedAt, job.completedAt)
          return (
            <>
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
              <SectionHeading>Trace runs</SectionHeading>
              {job.runs.length === 0 && (
                <p className="text-muted-foreground">
                  No traces uploaded for this job.
                </p>
              )}
              {job.runs.map((run) => (
                <RunCard key={run._id} run={run} repo={repo} />
              ))}
            </>
          )
        }}
      </QueryState>
    </div>
  )
}
