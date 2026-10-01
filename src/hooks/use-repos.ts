import { useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexAction } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
import { useSuspenseEntity } from '#/hooks/use-suspense-entity'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const REPOS_PAGE_SIZE = 25

export const useRepos = (search?: string) =>
  usePaginatedQuery(
    api.repos.listRepos,
    { search },
    { initialNumItems: REPOS_PAGE_SIZE },
  )

export const repoQueryOptions = (repoId: Id<'repos'>) =>
  convexQuery(api.repos.getRepo, { repoId })

/** Expects a loader to have ensured the query. */
export const useRepo = (repoId: Id<'repos'>) =>
  useSuspenseEntity(repoQueryOptions(repoId))

export function useReloadRepos() {
  const reloadRepos = useConvexAction(api.repos.reloadRepos)
  const reload = useMutation({ mutationFn: () => reloadRepos({}) })
  const { data: reloading } = useQuery(
    convexQuery(api.reloadLocks.isUserReloading, {}),
  )
  return {
    mutate: reload.mutate,
    isPending: reload.isPending || reloading === true,
    error: reload.error,
  }
}

/** Scans the Git hosts once when no repos are stored yet. Mount it once, app-wide. */
export function useInitialRepoScan() {
  const { status, results } = useRepos()
  const reload = useReloadRepos()
  const scanned = useRef(false)
  useEffect(() => {
    if (
      status === 'Exhausted' &&
      results.length === 0 &&
      !scanned.current &&
      !reload.isPending
    ) {
      scanned.current = true
      reload.mutate()
    }
  }, [status, results.length, reload.isPending, reload.mutate])
}
