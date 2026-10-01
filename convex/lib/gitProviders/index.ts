import { githubAdapter } from './github'
import type { GitProviderRegistry } from './types'

// Adding Gitea/Forgejo: extend `gitProviderSchema`, implement a GitProviderAdapter, register it here.
export const gitProviders: GitProviderRegistry = {
  github: githubAdapter,
}
