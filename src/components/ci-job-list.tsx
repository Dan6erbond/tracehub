import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useCiJobs } from '#/hooks/use-ci-jobs'
import { formatDuration } from '#/lib/format'
import type { Id } from '../../convex/_generated/dataModel'

/** CI jobs of one commit as reported by the Git host, with the trace runs uploaded for each. */
export function CiJobList({
  repoId,
  sha,
}: {
  repoId: Id<'repos'>
  sha: string
}) {
  const jobs = useCiJobs(repoId, sha)

  if (jobs.isPending) return <Skeleton className="h-24 w-full" />
  if (!jobs.data?.length) return null

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">CI jobs</h3>
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
          {jobs.data.map((job) => (
            <TableRow key={job._id}>
              <TableCell>
                {job.url ? (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {job.name}
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </a>
                ) : (
                  job.name
                )}
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
                      params={{ repoId, runId: run._id }}
                    >
                      <TraceCountsBadges counts={run.traceCounts} />
                    </Link>
                  ))}
                  {job.runs.length === 0 && (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
