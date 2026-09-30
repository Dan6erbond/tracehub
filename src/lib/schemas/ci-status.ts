import { z } from 'zod'

export const ciStatusSchema = z.enum(['success', 'failure', 'pending'])
export type CiStatus = z.infer<typeof ciStatusSchema>
