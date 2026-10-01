import {
  createAuthorizationURL,
  refreshAccessToken,
  validateAuthorizationCode,
} from 'better-auth/oauth2'
import { isGithubDotCom, resolveApiUrl } from '../apiUrl'
import type { OAuthProvider } from 'better-auth/oauth2'
import type { Credentials, ProviderConfig } from '../types'

// `repo` is needed to list private repositories.
const SCOPES = ['read:user', 'user:email', 'repo']

interface GithubProfile {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
}

interface GithubEmail {
  email: string
  primary: boolean
  verified: boolean
}

const fetchJson = async <T>(url: string, accessToken: string) => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${accessToken}`,
      'user-agent': 'tracehub',
    },
  })
  return response.ok ? ((await response.json()) as T) : null
}

/**
 * Like Better Auth's GitHub provider, with the host taken from the provider row, so it serves github.com and GitHub Enterprise Server.
 * `disableImplicitSignUp` stays unset: it only holds while the client omits `requestSignUp`, so sign-up is gated in `gateUserCreation` instead.
 */
export const githubOAuthProvider = (
  provider: ProviderConfig,
  { clientId, clientSecret }: Credentials,
): OAuthProvider => {
  const apiUrl = resolveApiUrl(provider)
  // GitHub Enterprise Server releases differ in PKCE support, so only github.com gets it.
  const usePkce = isGithubDotCom(provider)
  const options = { clientId, clientSecret }
  const tokenEndpoint = `${provider.baseUrl}/login/oauth/access_token`

  return {
    id: provider.slug,
    name: provider.name,
    options,
    createAuthorizationURL: ({ state, scopes, codeVerifier, redirectURI }) =>
      createAuthorizationURL({
        id: provider.slug,
        options,
        authorizationEndpoint: `${provider.baseUrl}/login/oauth/authorize`,
        scopes: [...SCOPES, ...(scopes ?? [])],
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
      // A rejected code is answered with a 200 and an error body.
      return tokens.accessToken ? tokens : null
    },
    // Only tokens of GitHub Apps expire; OAuth app tokens never need this.
    refreshAccessToken: (refreshToken) =>
      refreshAccessToken({ refreshToken, options, tokenEndpoint }),
    getUserInfo: async ({ accessToken }) => {
      if (!accessToken) return null
      const profile = await fetchJson<GithubProfile>(
        `${apiUrl}/user`,
        accessToken,
      )
      if (!profile) return null
      const emails = await fetchJson<Array<GithubEmail>>(
        `${apiUrl}/user/emails`,
        accessToken,
      )
      // A link or sign-in on an unverified address would let anyone claim it, so a verified one is preferred over the public profile email.
      const chosen =
        emails?.find((e) => e.primary && e.verified) ??
        emails?.find((e) => e.verified) ??
        emails?.find((e) => e.primary) ??
        emails?.[0]
      const email = chosen?.email ?? profile.email
      const emailVerified = chosen?.verified ?? false
      return {
        user: {
          id: profile.id,
          name: profile.name ?? profile.login,
          email,
          image: profile.avatar_url,
          emailVerified,
        },
        data: profile,
      }
    },
  }
}
