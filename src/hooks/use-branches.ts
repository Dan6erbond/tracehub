import { useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexAction } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
import { useSuspenseEntity } from '#/hooks/use-suspense-entity'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type { RepoView } from '#/lib/schemas/host-links'

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

export const branchQueryOptions = (repoId: Id<'repos'>, name: string) =>
  convexQuery(api.branches.getBranch, { repoId, name })

/** For a branch that may not exist (yet) or may be skipped; `useBranch` is the one to use under a loader. */
export const useOptionalBranch = (repoId: Id<'repos'>, name?: string) =>
  useQuery(
    name === undefined
      ? convexQuery(api.branches.getBranch, 'skip')
      : branchQueryOptions(repoId, name),
  )

/** Expects a loader to have ensured the query. */
export const useBranch = (repoId: Id<'repos'>, name: string) =>
  useSuspenseEntity(branchQueryOptions(repoId, name))

/** Lists branches with the repo's default branch always pinned first, even when the open-pull-request filter would hide it. */
export function useBranchesDefaultFirst(
  repo: RepoView,
  openPullRequestsOnly: boolean,
) {
  const { results, ...rest } = useBranches(repo._id, openPullRequestsOnly)
  const { data: defaultBranch } = useOptionalBranch(
    repo._id,
    repo.defaultBranch,
  )
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
