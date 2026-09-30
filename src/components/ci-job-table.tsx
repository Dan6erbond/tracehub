import { Link } from '@tanstack/react-router'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { ExternalTextLink } from '#/components/external-text-link'
import { LinkRow, RowLink } from '#/components/row-link'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatDuration } from '#/lib/format'
import { jobUrl } from '#/lib/git-host'
import type { CiJobWithRuns } from '../../convex/ciJobs'
import type { Doc } from '../../convex/_generated/dataModel'

/** Jobs with their status, timing and uploaded trace runs; each opens its detail page, with the host's page beside it. */
export function CiJobTable({
  repo,
  jobs,
}: {
  repo: Doc<'repos'>
  jobs: Array<CiJobWithRuns>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Job</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Traces</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <LinkRow key={job._id}>
            <TableCell>
              <span className="flex items-center gap-2">
                <RowLink
                  to="/repos/$repoId/jobs/$jobId"
                  params={{ repoId: repo._id, jobId: job._id }}
                  className="hover:underline"
                >
                  {job.name}
                </RowLink>
                <ExternalTextLink href={jobUrl(repo, job)} />
              </span>
            </TableCell>
            <TableCell>
              <CiStatusBadge status={job.status} />
            </TableCell>
            <TableCell>
              {job.startedAt !== undefined && job.completedAt !== undefined
                ? formatDuration(job.completedAt - job.startedAt)
                : '-'}
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                {job.runs.map((run) => (
                  <Link
                    key={run._id}
                    to="/repos/$repoId/runs/$runId"
                    params={{ repoId: repo._id, runId: run._id }}
                  >
                    <TraceCountsBadges counts={run.traceCounts} />
                  </Link>
                ))}
                {job.runs.length === 0 && (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>
            </TableCell>
          </LinkRow>
        ))}
      </TableBody>
    </Table>
  )
}
