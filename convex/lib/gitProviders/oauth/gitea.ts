import { providerScopes } from '../../../../src/lib/provider-scopes'
import { resolveApiUrl } from '../apiUrl'
import { giteaProfileSchema } from '../giteaApi'
import { hostOAuthProvider } from './hostOAuthProvider'
import { fetchJson, hostEmailsSchema, selectEmail } from './profile'
import type { OAuthProvider } from 'better-auth/oauth2'
import type { GitProviderType } from '../../../../src/lib/schemas/git-provider'
import type { Credentials, ProviderConfig } from '../types'

/** One implementation for Gitea and Forgejo, whose OAuth2 provider and `/user` endpoints are the same. */
export const giteaOAuthProvider =
  (type: Extract<GitProviderType, 'gitea' | 'forgejo'>) =>
  (provider: ProviderConfig, credentials: Credentials): OAuthProvider => {
    const apiUrl = resolveApiUrl(provider)
    return hostOAuthProvider({
      provider,
      credentials,
      scopes: providerScopes[type],
      usePkce: true,
      getUserInfo: async (accessToken) => {
        const profile = await fetchJson(
          `${apiUrl}/user`,
          accessToken,
          giteaProfileSchema,
        )
        if (!profile) return null
        const emails = await fetchJson(
          `${apiUrl}/user/emails`,
          accessToken,
          hostEmailsSchema,
        )
        if (!emails)
          console.warn(
            `${provider.slug}: the email addresses of ${profile.login} could not be read, so the email counts as unverified`,
          )
        return {
          user: {
            id: profile.id,
            name: profile.full_name || profile.login,
            image: profile.avatar_url ?? undefined,
            ...selectEmail(emails, profile.email),
          },
          data: profile,
        }
      },
    })
  }
