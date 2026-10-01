import { Fragment } from 'react'
import { PaginatedList } from '#/components/paginated-list'
import { RunCard } from '#/components/run-card'
import { SectionHeading } from '#/components/section-heading'
import { RUNS_PAGE_SIZE } from '#/hooks/use-runs'
import type { UsePaginatedQueryResult } from 'convex/react'
import type { RunDetail } from '../../convex/runs'

/** Runs from a paginated query. With `pinnedFirst`, the query returns pinned runs first and they sit under their own heading. */
export function RunList({
  query,
  pinnedFirst = false,
}: {
  query: UsePaginatedQueryResult<RunDetail>
  pinnedFirst?: boolean
}) {
  return (
    <PaginatedList
      query={query}
      pageSize={RUNS_PAGE_SIZE}
      empty={<p className="text-muted-foreground">No runs uploaded yet.</p>}
    >
      {(results) => {
        const pinnedCount = pinnedFirst
          ? results.filter((run) => run.pinnedAt !== undefined).length
          : 0
        return results.map((run, index) => (
          <Fragment key={run._id}>
            {pinnedCount > 0 && index === 0 && (
              <SectionHeading subtle>Pinned</SectionHeading>
            )}
            {pinnedCount > 0 && index === pinnedCount && (
              <SectionHeading subtle className="mt-2">
                All runs
              </SectionHeading>
            )}
            <RunCard run={run} />
          </Fragment>
        ))
      }}
    </PaginatedList>
  )
}
