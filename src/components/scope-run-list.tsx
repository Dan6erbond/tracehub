import { RunList } from '#/components/run-list'
import { useRuns } from '#/hooks/use-runs'
import type { Doc } from '../../convex/_generated/dataModel'
import type { RunScope } from '#/lib/schemas/run'

/** Runs of a branch or pull request, pinned runs first. */
export function ScopeRunList({
  repo,
  scope,
}: {
  repo: Doc<'repos'>
  scope: RunScope
}) {
  const runs = useRuns(repo._id, scope)
  return <RunList repo={repo} query={runs} pinnedFirst />
}
