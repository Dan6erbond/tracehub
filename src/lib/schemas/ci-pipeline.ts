import { z } from 'zod'
import { ciStatusSchema } from './ci-status'
import { httpUrlSchema } from './url'

export const ciPipelineSchema = z.object({
  sha: z.string(),
  // The host's own identity of the pipeline (GitHub workflow run id); uploads name it as `externalRunId`.
  externalId: z.string(),
  name: z.string(),
  // Absent on pipelines created from an upload until the host reports them.
  status: ciStatusSchema.optional(),
  // Head branch of runs on this repo's own branches; fork runs carry none, since a fork can reuse a branch name.
  branch: z.string().optional(),
  prNumber: z.number().int().optional(),
  trigger: z.string().optional(),
  // Page of a pipeline of CI outside the Git host, which only that CI knows; host pipelines derive theirs from the id.
  url: httpUrlSchema.optional(),
  startedAt: z.number(),
  completedAt: z.number().optional(),
})
export type CiPipeline = z.infer<typeof ciPipelineSchema>
