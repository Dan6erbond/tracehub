import { CiStatusBadge } from '#/components/ci-status-badge'
import { ExternalTextLink } from '#/components/external-text-link'
import { LinkRow } from '#/components/row-link'
import { StretchedLink } from '#/components/stretched-link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatElapsed } from '#/lib/format'
import { jobUrl } from '#/lib/git-host'
import type { CiJobWithRunCount } from '../../convex/ciJobs'
import type { Doc } from '../../convex/_generated/dataModel'

/** Jobs with their status, timing and number of uploaded trace runs; each opens its detail page, with the host's page beside it. */
export function CiJobTable({
  repo,
  jobs,
  truncated = false,
}: {
  repo: Doc<'repos'>
  jobs: Array<CiJobWithRunCount>
  truncated?: boolean
}) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Runs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <LinkRow key={job._id}>
              <TableCell>
                <span className="flex items-center gap-2">
                  <StretchedLink
                    to="/repos/$repoId/jobs/$jobId"
                    params={{ repoId: repo._id, jobId: job._id }}
                    className="hover:underline"
                  >
                    {job.name}
                  </StretchedLink>
                  <ExternalTextLink href={jobUrl(repo, job)} />
                </span>
              </TableCell>
              <TableCell>
                <CiStatusBadge status={job.status} />
              </TableCell>
              <TableCell>
                {formatElapsed(job.startedAt, job.completedAt) ?? '-'}
              </TableCell>
              <TableCell>
                {job.runCount === 0
                  ? '-'
                  : `${job.runCount} ${job.runCount === 1 ? 'run' : 'runs'}`}
              </TableCell>
            </LinkRow>
          ))}
        </TableBody>
      </Table>
      {truncated && (
        <p className="text-sm text-muted-foreground">
          Only the first {jobs.length} jobs are shown.
        </p>
      )}
    </>
  )
}
