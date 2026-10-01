import { useOptionalBranch } from '#/hooks/use-branches'
import { useOptionalPullRequest } from '#/hooks/use-pull-requests'
import { useOptionalRun } from '#/hooks/use-runs'
import { targetBranch } from '#/lib/schemas/trace-target'
import type { Doc } from '../../convex/_generated/dataModel'
import type { TraceTargetSearch } from '#/lib/schemas/trace-target'

export type TraceTarget =
  | { kind: 'branch'; branch: string; sha: string }
  | { kind: 'pull'; number: number; sha: string; title: string }
  | { kind: 'run'; run: Doc<'runs'> }

/**
 * Resolves the upload search params to a target with the data the form prefills; `undefined` while loading.
 * The route loader guarantees a run or pull request exists; a branch that is not stored yet is a valid target without a head sha.
 */
export function useTraceTarget(
  repo: Doc<'repos'>,
  search: TraceTargetSearch,
): TraceTarget | undefined {
  const { pull, job } = search
  const branchName = targetBranch(search, repo) ?? ''
  const run = useOptionalRun(repo._id, job)
  const pullRequest = useOptionalPullRequest(repo._id, job ? undefined : pull)
  const branchDoc = useOptionalBranch(
    repo._id,
    job || pull ? undefined : branchName,
  )

  if (job) return run.data ? { kind: 'run', run: run.data } : undefined
  if (pull)
    return pullRequest.data
      ? {
          kind: 'pull',
          number: pull,
          sha: pullRequest.data.headSha,
          title: pullRequest.data.title,
        }
      : undefined
  if (branchDoc.isPending) return undefined
  return {
    kind: 'branch',
    branch: branchName,
    sha: branchDoc.data?.headSha ?? '',
  }
}
