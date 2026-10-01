import { ErrorAlert } from '#/components/error-alert'
import { authErrorMessage } from '#/lib/auth-errors'

/** Explains the `?error=` code Better Auth appends when it sends a user back after a failed OAuth sign-in or link. */
export function AuthErrorAlert({ code }: { code?: string }) {
  if (!code) return null
  return (
    <ErrorAlert error={new Error(code)}>{authErrorMessage(code)}</ErrorAlert>
  )
}
