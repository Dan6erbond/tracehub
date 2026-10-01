import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseEntity } from '#/hooks/use-suspense-entity'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const useOtherChecks = (repoId: Id<'repos'>, sha: string) =>
  useQuery(convexQuery(api.ciJobs.listOtherChecks, { repoId, sha }))

export const usePipelineJobs = (
  repoId: Id<'repos'>,
  pipelineId: Id<'ciPipelines'>,
) => useQuery(convexQuery(api.ciJobs.listPipelineJobs, { repoId, pipelineId }))

export const jobQueryOptions = (repoId: Id<'repos'>, jobId: Id<'ciJobs'>) =>
  convexQuery(api.ciJobs.getJob, { repoId, jobId })

/** Expects a loader to have ensured the query. */
export const useJob = (repoId: Id<'repos'>, jobId: Id<'ciJobs'>) =>
  useSuspenseEntity(jobQueryOptions(repoId, jobId))
