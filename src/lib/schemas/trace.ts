import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod4'

export const traceStatusSchema = z.enum([
  'passed',
  'failed',
  'timedOut',
  'skipped',
  'interrupted',
  'unknown',
])
export type TraceStatus = z.infer<typeof traceStatusSchema>

export const traceSchema = z.object({
  title: z.string().trim().min(1),
  status: traceStatusSchema,
  durationMs: z.number().nonnegative().optional(),
  jobName: z.string().trim().min(1).optional(),
  fileName: z.string(),
  size: z.number().nonnegative(),
  storageId: zid('_storage'),
})
export type Trace = z.infer<typeof traceSchema>

export const traceInputSchema = traceSchema
export type TraceInput = z.infer<typeof traceInputSchema>

export const traceCountsSchema = z.object({
  total: z.number(),
  byStatus: z.record(traceStatusSchema, z.number()),
})
export type TraceCounts = z.infer<typeof traceCountsSchema>
