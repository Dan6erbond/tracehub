import { useMutation, useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
import { useSuspenseEntity } from '#/hooks/use-suspense-entity'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type { RunScope } from '#/lib/schemas/run'

export const RUNS_PAGE_SIZE = 20

export const useRuns = (repoId: Id<'repos'>, scope: RunScope) =>
  usePaginatedQuery(
    api.runs.listRuns,
    { repoId, scope },
    { initialNumItems: RUNS_PAGE_SIZE },
  )

export const runQueryOptions = (repoId: Id<'repos'>, runId: Id<'runs'>) =>
  convexQuery(api.runs.getRun, { repoId, runId })

/** For a run that may be absent (conditional use); `useRun` is the one to use under a loader. */
export const useOptionalRun = (repoId: Id<'repos'>, runId?: Id<'runs'>) =>
  useQuery(
    runId
      ? runQueryOptions(repoId, runId)
      : convexQuery(api.runs.getRun, 'skip'),
  )

/** Expects a loader to have ensured the query. */
export const useRun = (repoId: Id<'repos'>, runId: Id<'runs'>) =>
  useSuspenseEntity(runQueryOptions(repoId, runId))

export const useScopeCounts = (repoId: Id<'repos'>, scope: RunScope) =>
  useQuery(convexQuery(api.traces.getScopeCounts, { repoId, scope }))

export const useSetRunPinned = () =>
  useMutation({ mutationFn: useConvexMutation(api.runs.setRunPinned) })
