import { z } from 'zod'

/** A Better Auth user as the admin area shows it. */
export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string().optional(),
  banned: z.boolean().optional(),
  createdAt: z.number(),
})
export type AdminUser = z.infer<typeof adminUserSchema>
