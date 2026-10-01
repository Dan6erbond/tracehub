import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseEntity } from '#/hooks/use-suspense-entity'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const useCiJobs = (repoId: Id<'repos'>, sha: string) =>
  useQuery(convexQuery(api.ciJobs.listJobs, { repoId, sha }))

export const jobQueryOptions = (repoId: Id<'repos'>, jobId: Id<'ciJobs'>) =>
  convexQuery(api.ciJobs.getJob, { repoId, jobId })

/** Expects a loader to have ensured the query. */
export const useJob = (repoId: Id<'repos'>, jobId: Id<'ciJobs'>) =>
  useSuspenseEntity(jobQueryOptions(repoId, jobId))
