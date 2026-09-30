import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { CommitLink } from '#/components/commit-link'
import { ExternalTextLink } from '#/components/external-text-link'
import { RunCard } from '#/components/run-card'
import { Skeleton } from '#/components/ui/skeleton'
import { useJob } from '#/hooks/use-ci-pipelines'
import { formatDuration } from '#/lib/format'
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
        <Link
          to="/repos/$repoId/pipelines/$pipelineId"
          params={{ repoId, pipelineId: pipeline._id }}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {pipeline.name} #{pipeline.externalId}
        </Link>
      ) : (
        <Link
          to="/repos/$repoId/pipelines"
          params={{ repoId }}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Pipelines
        </Link>
      )}
      {result.isPending && <Skeleton className="h-10 w-64" />}
      {result.data === null && (
        <p className="text-muted-foreground">Job not found.</p>
      )}
      {result.data && (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{result.data.job.name}</h2>
              <CiStatusBadge status={result.data.job.status} />
              <ExternalTextLink href={jobUrl(repo, result.data.job)} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CommitLink repo={repo} sha={result.data.job.sha} />
              {result.data.job.startedAt !== undefined && (
                <span>
                  {new Date(result.data.job.startedAt).toLocaleString()}
                </span>
              )}
              {result.data.job.startedAt !== undefined &&
                result.data.job.completedAt !== undefined && (
                  <span>
                    {formatDuration(
                      result.data.job.completedAt - result.data.job.startedAt,
                    )}
                  </span>
                )}
            </div>
          </div>
          <h3 className="text-lg font-semibold">Trace runs</h3>
          {result.data.job.runs.length === 0 && (
            <p className="text-muted-foreground">
              No traces uploaded for this job.
            </p>
          )}
          {result.data.job.runs.map((run) => (
            <RunCard key={run._id} run={run} repo={repo} />
          ))}
        </>
      )}
    </div>
  )
}
