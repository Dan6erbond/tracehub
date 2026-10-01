import { useMutation } from '@tanstack/react-query'
import { authClient } from '#/lib/auth-client'
import { loginPath } from '#/lib/auth-errors'
import { unwrapAuth } from '#/lib/auth-result'
import type { SignIn } from '#/lib/schemas/sign-in'
import type { SignUp } from '#/lib/schemas/sign-up'

/** A full page load hands the new session to Convex with the server-rendered token, so no query runs before its websocket is authenticated, and no cache of a previous user survives. */
const enterApp = (path: string) => window.location.assign(path)

export const useSignIn = () =>
  useMutation({
    mutationFn: (values: SignIn) => unwrapAuth(authClient.signIn.email(values)),
    onSuccess: () => enterApp('/'),
  })

/** Sends the user to the Git host to authorize; a failure there comes back to the login page as `?error=`. */
export const useSocialSignIn = () =>
  useMutation({
    mutationFn: (providerSlug: string) =>
      unwrapAuth(
        authClient.signIn.social({
          provider: providerSlug,
          callbackURL: '/',
          errorCallbackURL: loginPath,
        }),
      ),
  })

/** Signs up and signs in; the first user of an instance becomes its admin. */
export const useSignUp = (redirectTo: '/' | '/admin/settings') =>
  useMutation({
    mutationFn: ({ name, email, password }: SignUp) =>
      unwrapAuth(authClient.signUp.email({ name, email, password })),
    onSuccess: () => enterApp(redirectTo),
  })
