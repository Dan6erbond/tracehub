import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useConvexAction } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export const REPOS_PAGE_SIZE = 25

export const useRepos = () =>
  usePaginatedQuery(
    api.repos.listRepos,
    {},
    { initialNumItems: REPOS_PAGE_SIZE },
  )

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
