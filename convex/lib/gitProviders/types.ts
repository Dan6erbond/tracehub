import type { GitProvider, Repo } from '../../../src/lib/schemas/repo'

export interface GitProviderAdapter {
  /** Better Auth `providerId` of the linked account whose token this adapter uses. */
  readonly authProviderId: string
  listRepositories: (accessToken: string) => Promise<Array<Repo>>
}

export type GitProviderRegistry = Record<GitProvider, GitProviderAdapter>
