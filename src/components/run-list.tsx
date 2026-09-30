import { Fragment } from 'react'
import { InfiniteScrollTrigger } from '#/components/infinite-scroll-trigger'
import { RunCard } from '#/components/run-card'
import { Skeleton } from '#/components/ui/skeleton'
import { RUNS_PAGE_SIZE, useRuns } from '#/hooks/use-runs'
import type { Doc } from '../../convex/_generated/dataModel'
import type { RunScope } from '#/lib/schemas/run'

/** Runs newest first; pinned runs (which the query returns first) sit under their own heading. */
export function RunList({
  repo,
  scope,
}: {
  repo: Doc<'repos'>
  scope: RunScope
}) {
  const { results, status, loadMore } = useRuns(repo._id, scope)
  const pinnedCount = results.filter((run) => run.pinnedAt !== undefined).length

  if (status === 'LoadingFirstPage') return <Skeleton className="h-32 w-full" />
  if (results.length === 0)
    return <p className="text-muted-foreground">No runs uploaded yet.</p>

  return (
    <div className="flex flex-col gap-3">
      {results.map((run, index) => (
        <Fragment key={run._id}>
          {pinnedCount > 0 && index === 0 && (
            <h3 className="text-sm font-medium text-muted-foreground">
              Pinned
            </h3>
          )}
          {pinnedCount > 0 && index === pinnedCount && (
            <h3 className="mt-2 text-sm font-medium text-muted-foreground">
              All runs
            </h3>
          )}
          <RunCard run={run} repo={repo} />
        </Fragment>
      ))}
      <InfiniteScrollTrigger
        canLoadMore={status === 'CanLoadMore'}
        isLoading={status === 'LoadingMore'}
        onLoadMore={() => loadMore(RUNS_PAGE_SIZE)}
      />
    </div>
  )
}
