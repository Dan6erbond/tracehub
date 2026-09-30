import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
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
  const repoId: Id<'repos'> = repo._id
  const branchName = branch ?? repo.defaultBranch ?? ''
  const run = useQuery(
    convexQuery(api.runs.getRun, job ? { repoId, runId: job } : 'skip'),
  )
  const pullRequest = useQuery(
    convexQuery(
      api.pullRequests.getPullRequest,
      !job && pull ? { repoId, number: pull } : 'skip',
    ),
  )
  const branchDoc = useQuery(
    convexQuery(
      api.branches.getBranch,
      !job && !pull ? { repoId, name: branchName } : 'skip',
    ),
  )

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
