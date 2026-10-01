import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseEntity } from '#/hooks/use-suspense-entity'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const pullRequestQueryOptions = (repoId: Id<'repos'>, number: number) =>
  convexQuery(api.pullRequests.getPullRequest, { repoId, number })

/** For a pull request that may be absent (conditional use); `usePullRequest` is the one to use under a loader. */
export const useOptionalPullRequest = (repoId: Id<'repos'>, number?: number) =>
  useQuery(
    number === undefined
      ? convexQuery(api.pullRequests.getPullRequest, 'skip')
      : pullRequestQueryOptions(repoId, number),
  )

/** Expects a loader to have ensured the query. */
export const usePullRequest = (repoId: Id<'repos'>, number: number) =>
  useSuspenseEntity(pullRequestQueryOptions(repoId, number))
