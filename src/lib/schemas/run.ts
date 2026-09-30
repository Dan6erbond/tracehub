import { z } from 'zod'
import { traceInputSchema } from './trace'

export const runSchema = z.object({
  sha: z.string().trim().min(1),
  branch: z.string().trim().min(1).optional(),
  prNumber: z.number().int().positive().optional(),
  externalRunId: z.string().trim().min(1).optional(),
  ciUrl: z.url().optional(),
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  pinnedAt: z.number().optional(),
})
export type Run = z.infer<typeof runSchema>

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

export const createRunInputSchema = runSchema
  .omit({ pinnedAt: true })
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
