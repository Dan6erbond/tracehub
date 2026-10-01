import { useBranch } from '#/hooks/use-branches'
import { usePullRequest } from '#/hooks/use-pull-requests'
import { useRun } from '#/hooks/use-runs'
import type { Doc } from '../../convex/_generated/dataModel'
import type { TraceTargetSearch } from '#/lib/schemas/trace-target'

export type TraceTarget =
  | { kind: 'branch'; branch: string; sha: string }
  | { kind: 'pull'; number: number; sha: string; title: string }
  | { kind: 'run'; run: Doc<'runs'> }

/** Resolves the upload search params to a target with the data the form prefills; `undefined` while loading, `null` when it does not exist. */
export function useTraceTarget(
  repo: Doc<'repos'>,
  { branch, pull, job }: TraceTargetSearch,
): TraceTarget | null | undefined {
  const branchName = branch ?? repo.defaultBranch ?? ''
  const run = useRun(repo._id, job)
  const pullRequest = usePullRequest(repo._id, job ? undefined : pull)
  const branchDoc = useBranch(repo._id, job || pull ? undefined : branchName)

  if (job)
    return run.isPending
      ? undefined
      : run.data && { kind: 'run', run: run.data }
  if (pull)
    return pullRequest.isPending
      ? undefined
      : pullRequest.data && {
          kind: 'pull',
          number: pull,
          sha: pullRequest.data.headSha,
          title: pullRequest.data.title,
        }
  if (branchDoc.isPending) return undefined
  return {
    kind: 'branch',
    branch: branchName,
    sha: branchDoc.data?.headSha ?? '',
  }
}
