import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { convexQuery, useConvexAction } from '@convex-dev/react-query'
import { usePaginatedQuery } from 'convex/react'
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
  const loadJobs = useConvexAction(api.ciPipelines.loadJobs)
  const loadedFor = useRef<Id<'ciPipelines'> | null>(null)
  const {
    mutate: loadJobsOnce,
    isPending: loadingJobs,
    error: loadJobsError,
  } = useMutation({ mutationFn: () => loadJobs({ repoId, pipelineId }) })
  // Pipelines older than the branch heads have no jobs until the host is asked once.
  useEffect(() => {
    if (pipeline.jobs.length === 0 && loadedFor.current !== pipelineId) {
      loadedFor.current = pipelineId
      loadJobsOnce()
    }
  }, [pipeline.jobs.length, pipelineId, loadJobsOnce])
  return { pipeline, loadingJobs, loadJobsError }
}
