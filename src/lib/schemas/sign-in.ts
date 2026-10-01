import { z } from 'zod'
import { emailSchema } from './credentials'

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
})
export type SignIn = z.infer<typeof signInSchema>
