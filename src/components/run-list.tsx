import { Fragment } from 'react'
import { PaginatedList } from '#/components/paginated-list'
import { RunCard } from '#/components/run-card'
import { SectionHeading } from '#/components/section-heading'
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
  const runs = useRuns(repo._id, scope)

  return (
    <PaginatedList
      query={runs}
      pageSize={RUNS_PAGE_SIZE}
      empty={<p className="text-muted-foreground">No runs uploaded yet.</p>}
    >
      {(results) => {
        const pinnedCount = results.filter(
          (run) => run.pinnedAt !== undefined,
        ).length
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
            <RunCard run={run} repo={repo} />
          </Fragment>
        ))
      }}
    </PaginatedList>
  )
}
