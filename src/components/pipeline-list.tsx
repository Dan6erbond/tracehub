import { InfiniteScrollTrigger } from '#/components/infinite-scroll-trigger'
import { PipelineTable } from '#/components/pipeline-table'
import { Skeleton } from '#/components/ui/skeleton'
import { PIPELINES_PAGE_SIZE, usePipelines } from '#/hooks/use-ci-pipelines'
import type { Doc } from '../../convex/_generated/dataModel'
import type { RunScope } from '#/lib/schemas/run'

/** Pipelines of a branch or pull request, or of the whole repo without a scope. */
export function PipelineList({
  repo,
  scope,
}: {
  repo: Doc<'repos'>
  scope?: RunScope
}) {
  const { results, status, loadMore } = usePipelines(repo._id, scope)

  if (status === 'LoadingFirstPage') return <Skeleton className="h-32 w-full" />
  if (results.length === 0)
    return (
      <p className="text-muted-foreground">
        No pipelines synced yet. Reload the repository to fetch them.
      </p>
    )

  return (
    <div className="flex flex-col gap-3">
      <PipelineTable repo={repo} pipelines={results} />
      <InfiniteScrollTrigger
        canLoadMore={status === 'CanLoadMore'}
        isLoading={status === 'LoadingMore'}
        onLoadMore={() => loadMore(PIPELINES_PAGE_SIZE)}
      />
    </div>
  )
}
