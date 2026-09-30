import { useMutation, useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
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

export const useRun = (repoId: Id<'repos'>, runId: Id<'runs'>) =>
  useQuery(convexQuery(api.runs.getRun, { repoId, runId }))

export const TRACES_PAGE_SIZE = 50

export const useTraces = (repoId: Id<'repos'>, runId: Id<'runs'>) =>
  usePaginatedQuery(
    api.traces.listTraces,
    { repoId, runId },
    { initialNumItems: TRACES_PAGE_SIZE },
  )

export const useScopeCounts = (repoId: Id<'repos'>, scope: RunScope) =>
  useQuery(convexQuery(api.traces.getScopeCounts, { repoId, scope }))

export const useSetRunPinned = () =>
  useMutation({ mutationFn: useConvexMutation(api.runs.setRunPinned) })
