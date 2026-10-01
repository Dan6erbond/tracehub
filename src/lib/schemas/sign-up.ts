import { z } from 'zod'
import {
  emailSchema,
  nameSchema,
  newPasswordSchema,
  passwordMismatch,
  passwordsMatch,
} from './credentials'

export const signUpBaseSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: newPasswordSchema,
  confirmPassword: z.string(),
})

export const signUpSchema = signUpBaseSchema.refine(
  passwordsMatch,
  passwordMismatch,
)
export type SignUp = z.infer<typeof signUpSchema>
