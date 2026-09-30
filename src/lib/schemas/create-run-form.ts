import { z } from 'zod'
import { traceStatusSchema } from './trace'
import { httpUrlSchema } from './url'

export const traceUploadItemSchema = z.object({
  file: z.instanceof(File),
  title: z.string().trim().min(1, 'A trace needs a name'),
  status: traceStatusSchema,
  durationMs: z.number().nonnegative().optional(),
})
export type TraceUploadItem = z.infer<typeof traceUploadItemSchema>

export const createRunFormSchema = z.object({
  title: z.string().trim(),
  description: z.string().trim(),
  sha: z.string().trim().min(1, 'The commit SHA is required'),
  externalRunId: z.string().trim(),
  externalJobId: z.string().trim(),
  jobName: z.string().trim(),
  ciUrl: z.union([z.literal(''), httpUrlSchema]),
  pinned: z.boolean(),
  traces: z.array(traceUploadItemSchema).min(1, 'Add at least one trace'),
})
export type CreateRunFormValues = z.infer<typeof createRunFormSchema>
