import {
  createAuthorizationURL,
  refreshAccessToken,
  validateAuthorizationCode,
} from 'better-auth/oauth2'
import type { OAuthProvider } from 'better-auth/oauth2'
import type { Credentials, ProviderConfig } from '../types'

type UserInfo = Awaited<ReturnType<OAuthProvider['getUserInfo']>>

/**
 * The authorization-code flow of a host that serves it at `<base>/login/oauth/{authorize,access_token}`, as GitHub, Gitea and Forgejo do.
 * `disableImplicitSignUp` stays unset: it only holds while the client omits `requestSignUp`, so sign-up is gated in `gateUserCreation` instead.
 */
export const hostOAuthProvider = ({
  provider,
  credentials: { clientId, clientSecret },
  scopes,
  usePkce,
  getUserInfo,
}: {
  provider: ProviderConfig
  credentials: Credentials
  scopes: ReadonlyArray<string>
  usePkce: boolean
  getUserInfo: (accessToken: string) => Promise<UserInfo>
}): OAuthProvider => {
  const options = { clientId, clientSecret }
  const tokenEndpoint = `${provider.baseUrl}/login/oauth/access_token`

  return {
    id: provider.slug,
    name: provider.name,
    options,
    createAuthorizationURL: ({
      state,
      scopes: requestedScopes,
      codeVerifier,
      redirectURI,
    }) =>
      createAuthorizationURL({
        id: provider.slug,
        options,
        authorizationEndpoint: `${provider.baseUrl}/login/oauth/authorize`,
        scopes: [...scopes, ...(requestedScopes ?? [])],
        state,
        codeVerifier: usePkce ? codeVerifier : undefined,
        redirectURI,
      }),
    validateAuthorizationCode: async ({ code, codeVerifier, redirectURI }) => {
      const tokens = await validateAuthorizationCode({
        code,
        codeVerifier: usePkce ? codeVerifier : undefined,
        redirectURI,
        options,
        tokenEndpoint,
      })
      // GitHub answers a rejected code with a 200 and an error body.
      return tokens.accessToken ? tokens : null
    },
    // Only tokens that expire are ever refreshed: those of GitHub Apps, Gitea and Forgejo.
    refreshAccessToken: (refreshToken) =>
      refreshAccessToken({ refreshToken, options, tokenEndpoint }),
    getUserInfo: ({ accessToken }) =>
      accessToken ? getUserInfo(accessToken) : Promise.resolve(null),
  }
}
