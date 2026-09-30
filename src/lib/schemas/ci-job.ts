import { z } from 'zod'
import { ciStatusSchema } from './ci-status'
import { httpUrlSchema } from './url'

/** A job as the Git host reports it; stored with `pipeline` resolved to a reference to the synced pipeline. */
export const ciJobSchema = z.object({
  sha: z.string(),
  // The host's own identity of the job (GitHub check run id, or the context of a commit status).
  externalId: z.string(),
  name: z.string(),
  // Absent on jobs created from an upload until the host reports them.
  status: ciStatusSchema.optional(),
  // `externalId` of the pipeline the job belongs to.
  pipeline: z.string().optional(),
  // Target of a commit status, which only the posting CI knows; check runs derive their page from the id.
  url: httpUrlSchema.optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
})
export type CiJob = z.infer<typeof ciJobSchema>
