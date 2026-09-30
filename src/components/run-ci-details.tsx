import { Link } from '@tanstack/react-router'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { ExternalTextLink } from '#/components/external-text-link'
import { jobUrl, pipelineUrl } from '#/lib/git-host'
import type { RunDetail } from '../../convex/runs'
import type { Doc } from '../../convex/_generated/dataModel'

/** The pipeline and job a run came from: links to their pages here, with the host's CI pages beside them. */
export function RunCiDetails({
  repo,
  run: { job, pipeline },
}: {
  repo: Doc<'repos'>
  run: RunDetail
}) {
  if (!job && !pipeline) return null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {pipeline && (
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">Pipeline</span>
          <Link
            to="/repos/$repoId/pipelines/$pipelineId"
            params={{ repoId: repo._id, pipelineId: pipeline._id }}
            className="hover:underline"
          >
            {pipeline.name} #{pipeline.externalId}
          </Link>
          <ExternalTextLink href={pipelineUrl(repo, pipeline)} />
        </span>
      )}
      {job && (
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">Job</span>
          <Link
            to="/repos/$repoId/jobs/$jobId"
            params={{ repoId: repo._id, jobId: job._id }}
            className="hover:underline"
          >
            {job.name}
          </Link>
          <ExternalTextLink href={jobUrl(repo, job)} />
          <CiStatusBadge status={job.status} />
        </span>
      )}
    </div>
  )
}
