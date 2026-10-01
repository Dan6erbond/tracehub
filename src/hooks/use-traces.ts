import { convexQuery } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
import { useSuspenseEntity } from '#/hooks/use-suspense-entity'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const TRACES_PAGE_SIZE = 50

export const useTraces = (repoId: Id<'repos'>, runId: Id<'runs'>) =>
  usePaginatedQuery(
    api.traces.listTraces,
    { repoId, runId },
    { initialNumItems: TRACES_PAGE_SIZE },
  )

export const traceQueryOptions = (repoId: Id<'repos'>, traceId: Id<'traces'>) =>
  convexQuery(api.traces.getTrace, { repoId, traceId })

/** Expects a loader to have ensured the query. */
export const useTrace = (repoId: Id<'repos'>, traceId: Id<'traces'>) =>
  useSuspenseEntity(traceQueryOptions(repoId, traceId))
