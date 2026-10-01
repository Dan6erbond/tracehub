import type { GitProviderType } from './schemas/git-provider'

/**
 * What TraceHub requests when a user signs in or links an account.
 * GitHub needs `repo` to list private repositories. Gitea and Forgejo scope tokens per category, and Forgejo before 9 ignores them.
 */
export const providerScopes: Record<GitProviderType, ReadonlyArray<string>> = {
  github: ['read:user', 'user:email', 'repo'],
  gitea: ['read:user', 'read:repository'],
  forgejo: ['read:user', 'read:repository'],
}

export const formatScopes = (type: GitProviderType) =>
  new Intl.ListFormat('en-GB').format(providerScopes[type])
