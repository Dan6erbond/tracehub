import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const useCiJobs = (repoId: Id<'repos'>, sha: string) =>
  useQuery(convexQuery(api.ciJobs.listJobs, { repoId, sha }))
