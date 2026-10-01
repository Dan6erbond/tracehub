import { z } from 'zod'
import {
  emailSchema,
  nameSchema,
  newPasswordSchema,
  passwordMismatch,
  passwordsMatch,
} from './credentials'

export const signUpFields = {
  name: nameSchema,
  email: emailSchema,
  password: newPasswordSchema,
  confirmPassword: z.string(),
}

export const signUpSchema = z
  .object(signUpFields)
  .refine(passwordsMatch, passwordMismatch)
export type SignUp = z.infer<typeof signUpSchema>
