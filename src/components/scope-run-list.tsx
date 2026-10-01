import { RunList } from '#/components/run-list'
import { useRuns } from '#/hooks/use-runs'
import type { Id } from '../../convex/_generated/dataModel'
import type { RunScope } from '#/lib/schemas/run'

/** Runs of a branch or pull request, pinned runs first. */
export function ScopeRunList({
  repoId,
  scope,
}: {
  repoId: Id<'repos'>
  scope: RunScope
}) {
  const runs = useRuns(repoId, scope)
  return <RunList query={runs} pinnedFirst />
}
