import { BranchBadge } from '#/components/branch-badge'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { CommitLink } from '#/components/commit-link'
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
import { pipelineUrl } from '#/lib/git-host'
import type { PipelineWithCounts } from '../../convex/ciPipelines'
import type { Doc } from '../../convex/_generated/dataModel'

/** Pipelines newest first, each opening its detail page, with the host's page beside it. */
export function PipelineTable({
  repo,
  pipelines,
}: {
  repo: Doc<'repos'>
  pipelines: Array<PipelineWithCounts>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pipeline</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Commit</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Traces</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pipelines.map((pipeline) => (
          <LinkRow key={pipeline._id}>
            <TableCell>
              <span className="flex items-center gap-2">
                <RowLink
                  to="/repos/$repoId/pipelines/$pipelineId"
                  params={{ repoId: repo._id, pipelineId: pipeline._id }}
                  className="hover:underline"
                >
                  {pipeline.name}
                </RowLink>
                <span className="text-sm text-muted-foreground">
                  #{pipeline.externalId}
                </span>
                <ExternalTextLink href={pipelineUrl(repo, pipeline)} />
              </span>
            </TableCell>
            <TableCell>
              <CiStatusBadge status={pipeline.status} />
            </TableCell>
            <TableCell>
              {pipeline.branch !== undefined ? (
                <BranchBadge repoId={repo._id} name={pipeline.branch} />
              ) : (
                '-'
              )}
            </TableCell>
            <TableCell>
              <CommitLink repo={repo} sha={pipeline.sha} />
            </TableCell>
            <TableCell>
              {new Date(pipeline.startedAt).toLocaleString()}
            </TableCell>
            <TableCell>
              {pipeline.completedAt !== undefined
                ? formatDuration(pipeline.completedAt - pipeline.startedAt)
                : '-'}
            </TableCell>
            <TableCell>
              <TraceCountsBadges counts={pipeline.traceCounts} />
            </TableCell>
          </LinkRow>
        ))}
      </TableBody>
    </Table>
  )
}
