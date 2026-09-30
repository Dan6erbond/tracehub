import { z } from 'zod'

export const ciStatusSchema = z.enum(['success', 'failure', 'pending'])
export type CiStatus = z.infer<typeof ciStatusSchema>

export const branchSchema = z.object({
  name: z.string(),
  headSha: z.string(),
  committedAt: z.number(),
  ciStatus: ciStatusSchema.optional(),
})
export type Branch = z.infer<typeof branchSchema>
