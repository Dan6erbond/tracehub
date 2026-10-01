import { githubOAuthProvider } from './github'
import { giteaOAuthProvider } from './gitea'
import type { OAuthProvider } from 'better-auth/oauth2'
import type { GitProviderType } from '../../../../src/lib/schemas/git-provider'
import type { Credentials, ProviderConfig } from '../types'

const oauthProviders: Record<
  GitProviderType,
  (provider: ProviderConfig, credentials: Credentials) => OAuthProvider
> = {
  github: githubOAuthProvider,
  gitea: giteaOAuthProvider('gitea'),
  forgejo: giteaOAuthProvider('forgejo'),
}

export const toOAuthProvider = (
  provider: ProviderConfig,
  credentials: Credentials,
) => oauthProviders[provider.type](provider, credentials)
