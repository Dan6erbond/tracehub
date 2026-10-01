import { z } from 'zod'
import { userRoles } from '../roles'
import { passwordMismatch, passwordsMatch } from './credentials'
import { signUpFields } from './sign-up'

export const createUserSchema = z
  .object({ ...signUpFields, role: z.enum(userRoles) })
  .refine(passwordsMatch, passwordMismatch)
export type CreateUser = z.infer<typeof createUserSchema>
