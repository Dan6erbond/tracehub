import { githubAdapter } from './github'
import type { GitProvider } from '../../../src/lib/schemas/repo'
import type { GitProviderRegistry } from './types'

// Adding Gitea/Forgejo: extend `gitProviderSchema`, implement a GitProviderAdapter, register it here.
export const gitProviders: GitProviderRegistry = {
  github: githubAdapter,
}

export const gitProviderIds = Object.keys(gitProviders) as Array<GitProvider>
