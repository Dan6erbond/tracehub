import { useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexAction } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'

export const BRANCHES_PAGE_SIZE = 20

export const useBranches = (
  repoId: Id<'repos'>,
  openPullRequestsOnly: boolean,
) =>
  usePaginatedQuery(
    api.branches.listBranches,
    { repoId, openPullRequestsOnly },
    { initialNumItems: BRANCHES_PAGE_SIZE },
  )

export const useBranch = (repoId: Id<'repos'>, name?: string) =>
  useQuery(
    convexQuery(
      api.branches.getBranch,
      name === undefined ? 'skip' : { repoId, name },
    ),
  )

/** Lists branches with the repo's default branch always pinned first, even when the open-pull-request filter would hide it. */
export function useBranchesDefaultFirst(
  repo: Doc<'repos'>,
  openPullRequestsOnly: boolean,
) {
  const { results, ...rest } = useBranches(repo._id, openPullRequestsOnly)
  const { data: defaultBranch } = useBranch(repo._id, repo.defaultBranch)
  const pinned = defaultBranch ? [defaultBranch] : []
  return {
    ...rest,
    results: [
      ...pinned,
      ...results.filter((b) => b.name !== repo.defaultBranch),
    ],
  }
}

export function useReloadRepo(repoId: Id<'repos'>) {
  const reloadRepo = useConvexAction(api.repos.reloadRepo)
  const reload = useMutation({ mutationFn: () => reloadRepo({ repoId }) })
  const { data: reloading } = useQuery(
    convexQuery(api.reloadLocks.isRepoReloading, { repoId }),
  )
  return {
    mutate: reload.mutate,
    isPending: reload.isPending || reloading === true,
    error: reload.error,
  }
}

/** Loads the repo's branches and PRs from the Git host once when no branches are stored yet. */
export function useInitialRepoSync(repoId: Id<'repos'>) {
  const { status, results } = useBranches(repoId, false)
  const reload = useReloadRepo(repoId)
  const synced = useRef(false)
  useEffect(() => {
    if (
      status === 'Exhausted' &&
      results.length === 0 &&
      !synced.current &&
      !reload.isPending
    ) {
      synced.current = true
      reload.mutate()
    }
  }, [status, results.length, reload.isPending, reload.mutate])
  return reload
}
