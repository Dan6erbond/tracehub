import { z } from 'zod'
import { providerScopes } from '../../../../src/lib/provider-scopes'
import { isGithubDotCom, resolveApiUrl } from '../apiUrl'
import { hostOAuthProvider } from './hostOAuthProvider'
import { fetchJson, hostEmailsSchema, selectEmail } from './profile'
import type { OAuthProvider } from 'better-auth/oauth2'
import type { Credentials, ProviderConfig } from '../types'

const githubProfileSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  avatar_url: z.string(),
})

const GITHUB_ACCEPT = 'application/vnd.github+json'

/** Like Better Auth's GitHub provider, with the host taken from the provider row, so it serves github.com and GitHub Enterprise Server. */
export const githubOAuthProvider = (
  provider: ProviderConfig,
  credentials: Credentials,
): OAuthProvider => {
  const apiUrl = resolveApiUrl(provider)
  return hostOAuthProvider({
    provider,
    credentials,
    scopes: providerScopes.github,
    // GitHub Enterprise Server releases differ in PKCE support, so only github.com gets it.
    usePkce: isGithubDotCom(provider),
    getUserInfo: async (accessToken) => {
      const profile = await fetchJson(
        `${apiUrl}/user`,
        accessToken,
        githubProfileSchema,
        GITHUB_ACCEPT,
      )
      if (!profile) return null
      const emails = await fetchJson(
        `${apiUrl}/user/emails`,
        accessToken,
        hostEmailsSchema,
        GITHUB_ACCEPT,
      )
      if (!emails)
        console.warn(
          `${provider.slug}: the email addresses of ${profile.login} could not be read, so the email counts as unverified. A GitHub App needs the "Email addresses" account permission`,
        )
      return {
        user: {
          id: profile.id,
          name: profile.name ?? profile.login,
          image: profile.avatar_url,
          ...selectEmail(emails, profile.email),
        },
        data: profile,
      }
    },
  })
}
