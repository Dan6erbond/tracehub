import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { convexQuery, useConvexAction } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
import { usePipelineJobs } from '#/hooks/use-ci-jobs'
import { useSuspenseEntity } from '#/hooks/use-suspense-entity'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type { RunScope } from '#/lib/schemas/run'

export const PIPELINES_PAGE_SIZE = 20

export const usePipelines = (repoId: Id<'repos'>, scope?: RunScope) =>
  usePaginatedQuery(
    api.ciPipelines.listPipelines,
    { repoId, scope },
    { initialNumItems: PIPELINES_PAGE_SIZE },
  )

export const pipelineQueryOptions = (
  repoId: Id<'repos'>,
  pipelineId: Id<'ciPipelines'>,
) => convexQuery(api.ciPipelines.getPipeline, { repoId, pipelineId })

/** Expects a loader to have ensured the pipeline query. */
export const usePipeline = (
  repoId: Id<'repos'>,
  pipelineId: Id<'ciPipelines'>,
) => {
  const pipeline = useSuspenseEntity(pipelineQueryOptions(repoId, pipelineId))
  const jobs = usePipelineJobs(repoId, pipelineId)
  const loadJobs = useConvexAction(api.ciPipelines.loadJobs)
  const loadedFor = useRef<Id<'ciPipelines'> | null>(null)
  const {
    mutate: loadJobsOnce,
    isPending: loadRunning,
    isIdle: loadNotStarted,
    error: loadJobsError,
  } = useMutation({ mutationFn: () => loadJobs({ repoId, pipelineId }) })
  // Pipelines older than the branch heads have no jobs until the host is asked once.
  useEffect(() => {
    if (jobs.data?.jobs.length === 0 && loadedFor.current !== pipelineId) {
      loadedFor.current = pipelineId
      loadJobsOnce()
    }
  }, [jobs.data?.jobs.length, pipelineId, loadJobsOnce])
  // Empty jobs stay in the loading state until the one-time load from the host has run.
  const loadingJobs =
    jobs.isPending ||
    loadRunning ||
    (jobs.data?.jobs.length === 0 && loadNotStarted)
  return { pipeline, jobs, loadingJobs, loadJobsError }
}
