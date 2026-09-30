import { z } from 'zod'
import { ciStatusSchema } from './ci-status'

export const ciJobSchema = z.object({
  sha: z.string(),
  // The host's own identity of the job (GitHub check run id, or the context of a commit status); runs reference it as `externalJobId`.
  externalId: z.string(),
  name: z.string(),
  status: ciStatusSchema,
  // `externalRunId` of the pipeline the job belongs to.
  pipeline: z.string().optional(),
  trigger: z.string().optional(),
  url: z.string().optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
})
export type CiJob = z.infer<typeof ciJobSchema>
