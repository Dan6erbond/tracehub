import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod4'
import { traceInputSchema } from './trace'
import { httpUrlSchema } from './url'

export const runSchema = z.object({
  sha: z.string().trim().min(1),
  branch: z.string().trim().min(1).optional(),
  prNumber: z.number().int().positive().optional(),
  pipelineId: zid('ciPipelines').optional(),
  jobId: zid('ciJobs').optional(),
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  pinnedAt: z.number().optional(),
})
export type Run = z.infer<typeof runSchema>

/** How an upload names the CI pipeline and job it runs in; the server resolves them to `pipelineId` and `jobId`. */
export const ciRefSchema = z.object({
  externalRunId: z.string().trim().min(1).optional(),
  externalJobId: z.string().trim().min(1).optional(),
  jobName: z.string().trim().min(1).optional(),
  ciUrl: httpUrlSchema.optional(),
})
export type CiRef = z.infer<typeof ciRefSchema>

export const runUploadSchema = runSchema
  .omit({ pinnedAt: true, pipelineId: true, jobId: true })
  .extend(ciRefSchema.shape)
export type RunUpload = z.infer<typeof runUploadSchema>

export const runScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('branch'), branch: z.string() }),
  z.object({ kind: z.literal('pull'), number: z.number().int() }),
])
export type RunScope = z.infer<typeof runScopeSchema>

/** A scope reduced to what runs can be matched by: a branch and/or pull request numbers. */
export const resolvedRunScopeSchema = z.object({
  branch: z.string().optional(),
  prNumbers: z.array(z.number().int()),
})
export type ResolvedRunScope = z.infer<typeof resolvedRunScopeSchema>

export const createRunInputSchema = runUploadSchema
  .extend({
    pinned: z.boolean(),
    traces: z.array(traceInputSchema).min(1),
  })
  .refine((run) => !run.pinned || run.prNumber !== undefined, {
    message: 'Only runs attached to a pull request can be pinned',
    path: ['pinned'],
  })
export type CreateRunInput = z.infer<typeof createRunInputSchema>

export const addTracesInputSchema = z.object({
  traces: z.array(traceInputSchema).min(1),
})
