import { Play } from 'lucide-react'
import { LinkRow, RowLink } from '#/components/row-link'
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

export function TraceTable({ traces }: { traces: Array<Doc<'traces'>> }) {
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
      <TableBody>
        {traces.map((trace) => (
          <LinkRow key={trace._id}>
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
                <RowLink
                  to="/repos/$repoId/traces/$traceId"
                  params={{ repoId: trace.repoId, traceId: trace._id }}
                >
                  <Play />
                  Open
                </RowLink>
              </Button>
            </TableCell>
          </LinkRow>
        ))}
      </TableBody>
    </Table>
  )
}
