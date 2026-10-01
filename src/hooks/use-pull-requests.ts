import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const usePullRequest = (repoId: Id<'repos'>, number?: number) =>
  useQuery(
    convexQuery(
      api.pullRequests.getPullRequest,
      number === undefined ? 'skip' : { repoId, number },
    ),
  )
