import type { Branch } from '../../../src/lib/schemas/branch'
import type { CiJob } from '../../../src/lib/schemas/ci-job'
import type { PullRequest } from '../../../src/lib/schemas/pull-request'
import type { GitProvider, Repo } from '../../../src/lib/schemas/repo'

export type RepoRef = Pick<Repo, 'owner' | 'name'>

export interface GitProviderAdapter {
  /** Better Auth `providerId` of the linked account whose token this adapter uses. */
  readonly authProviderId: string
  listRepositories: (accessToken: string) => Promise<Array<Repo>>
  /** Yields branches page by page so callers can persist in bounded chunks. */
  listBranches: (
    accessToken: string,
    repo: RepoRef,
  ) => AsyncIterable<Array<Branch>>
  /** Yields pull requests most recently updated first; with `since`, stops before older ones. */
  listPullRequests: (
    accessToken: string,
    repo: RepoRef,
    since?: number,
  ) => AsyncIterable<Array<PullRequest>>
  /** Yields the CI jobs (check runs and commit statuses) of the given commits in bounded batches. */
  listJobs: (
    accessToken: string,
    repo: RepoRef,
    shas: Array<string>,
  ) => AsyncIterable<Array<CiJob>>
}

export type GitProviderRegistry = Record<GitProvider, GitProviderAdapter>
