import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const TRACES_PAGE_SIZE = 50

export const useTraces = (repoId: Id<'repos'>, runId: Id<'runs'>) =>
  usePaginatedQuery(
    api.traces.listTraces,
    { repoId, runId },
    { initialNumItems: TRACES_PAGE_SIZE },
  )

export const useTrace = (repoId: Id<'repos'>, traceId: Id<'traces'>) =>
  useQuery(convexQuery(api.traces.getTrace, { repoId, traceId }))
