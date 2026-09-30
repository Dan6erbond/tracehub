import { Link } from '@tanstack/react-router'
import { Play } from 'lucide-react'
import { TraceStatusBadge } from '#/components/trace-status-badge'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatBytes, formatDuration } from '#/lib/format'
import type { Doc } from '../../convex/_generated/dataModel'

const NO_JOB = ''

const groupByJob = (traces: Array<Doc<'traces'>>) =>
  traces.reduce((groups, trace) => {
    const job = trace.jobName ?? NO_JOB
    groups.set(job, [...(groups.get(job) ?? []), trace])
    return groups
  }, new Map<string, Array<Doc<'traces'>>>())

/** Traces of one run, one table section per CI job. */
export function TraceTable({ traces }: { traces: Array<Doc<'traces'>> }) {
  const groups = groupByJob(traces)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Size</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      {[...groups].map(([jobName, jobTraces]) => (
        <TableBody key={jobName}>
          {(groups.size > 1 || jobName !== NO_JOB) && (
            <TableRow className="bg-muted/50">
              <TableCell colSpan={5} className="font-medium">
                {jobName || 'No job'}
              </TableCell>
            </TableRow>
          )}
          {jobTraces.map((trace) => (
            <TableRow key={trace._id}>
              <TableCell className="max-w-md truncate" title={trace.title}>
                {trace.title}
              </TableCell>
              <TableCell>
                <TraceStatusBadge status={trace.status} />
              </TableCell>
              <TableCell>
                {trace.durationMs === undefined
                  ? '-'
                  : formatDuration(trace.durationMs)}
              </TableCell>
              <TableCell>{formatBytes(trace.size)}</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/repos/$repoId/traces/$traceId"
                    params={{ repoId: trace.repoId, traceId: trace._id }}
                  >
                    <Play />
                    Open
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      ))}
    </Table>
  )
}
