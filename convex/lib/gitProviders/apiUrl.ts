import type { GitProviderType } from '../../../src/lib/schemas/git-provider'
import type { ProviderConfig } from './types'

const GITHUB_COM = 'https://github.com'

/** Base URLs are stored normalized, so github.com is matched exactly; a lookalike host or a path under it is an Enterprise Server. */
export const isGithubDotCom = ({ baseUrl }: Pick<ProviderConfig, 'baseUrl'>) =>
  baseUrl === GITHUB_COM

const giteaApiUrl = ({ baseUrl }: Pick<ProviderConfig, 'baseUrl'>) =>
  `${baseUrl}/api/v1`

const defaultApiUrls: Record<
  GitProviderType,
  (provider: Pick<ProviderConfig, 'baseUrl'>) => string
> = {
  github: (provider) =>
    isGithubDotCom(provider)
      ? 'https://api.github.com'
      : `${provider.baseUrl}/api/v3`,
  gitea: giteaApiUrl,
  forgejo: giteaApiUrl,
}

/** The one place that decides where a provider's REST API lives: its override, else the default of its type. */
export const resolveApiUrl = (
  provider: Pick<ProviderConfig, 'type' | 'baseUrl' | 'apiUrl'>,
) => provider.apiUrl ?? defaultApiUrls[provider.type](provider)
