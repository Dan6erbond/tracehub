import { z } from 'zod'

export const emailSchema = z.email('Enter a valid email address')

/** The bounds Better Auth enforces on new passwords. */
export const newPasswordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128, 'Use at most 128 characters')

export const nameSchema = z.string().trim().min(1, 'Enter a name')

export const passwordsMatch = (value: {
  password: string
  confirmPassword: string
}) => value.password === value.confirmPassword

/** For `.refine(passwordsMatch, passwordMismatch)` on an object with `password` and `confirmPassword`; the error lands on the confirmation field. */
export const passwordMismatch = {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
}
