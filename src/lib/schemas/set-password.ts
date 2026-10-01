import { z } from 'zod'
import {
  newPasswordSchema,
  passwordMismatch,
  passwordsMatch,
} from './credentials'

export const setPasswordSchema = z
  .object({ password: newPasswordSchema, confirmPassword: z.string() })
  .refine(passwordsMatch, passwordMismatch)
export type SetPassword = z.infer<typeof setPasswordSchema>
