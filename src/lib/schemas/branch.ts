import { z } from 'zod'
import { ciStatusSchema } from './ci-status'

export const branchSchema = z.object({
  name: z.string(),
  headSha: z.string(),
  committedAt: z.number(),
  ciStatus: ciStatusSchema.optional(),
})
export type Branch = z.infer<typeof branchSchema>
