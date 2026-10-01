import { BranchPage } from '#/components/branch-page'
import { PullRequestPage } from '#/components/pull-request-page'
import { RepoBranchesPage } from '#/components/repo-branches-page'
import { RunPage } from '#/components/run-page'
import { useOptionalBranch } from '#/hooks/use-branches'
import { targetBranch } from '#/lib/schemas/trace-target'
import type { Doc } from '../../convex/_generated/dataModel'
import type { TraceTargetSearch } from '#/lib/schemas/trace-target'

/** A branch that is not stored yet can still be an upload target, so its page only shows once it exists. */
function BranchTarget({ repo, name }: { repo: Doc<'repos'>; name: string }) {
  const { data: branch, isPending } = useOptionalBranch(repo._id, name)
  if (isPending) return null
  return branch ? (
    <BranchPage repo={repo} name={name} />
  ) : (
    <RepoBranchesPage repo={repo} />
  )
}

/** The page an upload is for, so it stays visible behind the upload sheet. */
export function TraceTargetPage({
  repo,
  search,
}: {
  repo: Doc<'repos'>
  search: TraceTargetSearch
}) {
  const { pull, job } = search
  if (job) return <RunPage repo={repo} runId={job} />
  if (pull) return <PullRequestPage repo={repo} number={pull} />
  const name = targetBranch(search, repo)
  return name ? (
    <BranchTarget repo={repo} name={name} />
  ) : (
    <RepoBranchesPage repo={repo} />
  )
}
