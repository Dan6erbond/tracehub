import { useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexAction } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const REPOS_PAGE_SIZE = 25

export const useRepos = (search?: string) =>
  usePaginatedQuery(
    api.repos.listRepos,
    { search },
    { initialNumItems: REPOS_PAGE_SIZE },
  )

export const useRepo = (repoId: Id<'repos'>) =>
  useQuery(convexQuery(api.repos.getRepo, { repoId }))

export function useReloadRepos() {
  const reloadRepos = useConvexAction(api.repos.reloadRepos)
  return useMutation({ mutationFn: () => reloadRepos({}) })
}

/** Scans the Git hosts once when no repos are stored yet. Mount it once, app-wide. */
export function useInitialRepoScan() {
  const { status, results } = useRepos()
  const reload = useReloadRepos()
  const scanned = useRef(false)
  useEffect(() => {
    if (status === 'Exhausted' && results.length === 0 && !scanned.current) {
      scanned.current = true
      reload.mutate()
    }
  }, [status, results.length, reload])
}
