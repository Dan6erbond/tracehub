import { z } from 'zod'
import { userRoles } from '../roles'
import { passwordMismatch, passwordsMatch } from './credentials'
import { signUpBaseSchema } from './sign-up'

export const createUserSchema = signUpBaseSchema
  .extend({ role: z.enum(userRoles) })
  .refine(passwordsMatch, passwordMismatch)
export type CreateUser = z.infer<typeof createUserSchema>
