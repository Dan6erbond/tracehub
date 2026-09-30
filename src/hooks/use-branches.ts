import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useConvexAction } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

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

export function useReloadRepo(repoId: Id<'repos'>) {
  const reloadRepo = useConvexAction(api.repos.reloadRepo)
  return useMutation({ mutationFn: () => reloadRepo({ repoId }) })
}

/** Loads the repo's branches and PRs from the Git host once when no branches are stored yet. */
export function useInitialRepoSync(repoId: Id<'repos'>) {
  const { status, results } = useBranches(repoId, false)
  const reload = useReloadRepo(repoId)
  const synced = useRef(false)
  useEffect(() => {
    if (status === 'Exhausted' && results.length === 0 && !synced.current) {
      synced.current = true
      reload.mutate()
    }
  }, [status, results.length, reload])
  return reload
}
