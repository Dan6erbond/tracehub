import { PaginatedList } from '#/components/paginated-list'
import { PipelineTable } from '#/components/pipeline-table'
import { PIPELINES_PAGE_SIZE, usePipelines } from '#/hooks/use-ci-pipelines'
import type { Id } from '../../convex/_generated/dataModel'
import type { RunScope } from '#/lib/schemas/run'

/** Pipelines of a branch or pull request, or of the whole repo without a scope. */
export function PipelineList({
  repoId,
  scope,
}: {
  repoId: Id<'repos'>
  scope?: RunScope
}) {
  const pipelines = usePipelines(repoId, scope)

  return (
    <PaginatedList
      query={pipelines}
      pageSize={PIPELINES_PAGE_SIZE}
      empty={
        <p className="text-muted-foreground">
          No pipelines synced yet. Reload the repository to fetch them.
        </p>
      }
    >
      {(results) => <PipelineTable repoId={repoId} pipelines={results} />}
    </PaginatedList>
  )
}
