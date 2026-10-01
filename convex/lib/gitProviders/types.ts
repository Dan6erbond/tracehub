import type { Branch } from '../../../src/lib/schemas/branch'
import type { CiJob } from '../../../src/lib/schemas/ci-job'
import type { CiPipeline } from '../../../src/lib/schemas/ci-pipeline'
import type { PullRequest } from '../../../src/lib/schemas/pull-request'
import type { Repo } from '../../../src/lib/schemas/repo'
import type { Doc } from '../../_generated/dataModel'

export type RepoRef = Pick<Repo, 'owner' | 'name'>

/** A provider row without the client credentials, for everything that talks to the host or links to it. */
export type ProviderConfig = Pick<
  Doc<'gitProviders'>,
  '_id' | 'slug' | 'type' | 'name' | 'baseUrl' | 'apiUrl' | 'enabled'
>

export interface Credentials {
  clientId: string
  clientSecret: string
}

export interface ProviderWithCredentials {
  provider: ProviderConfig
  credentials: Credentials
}

/** A repo with the provider it lives on; the `ctx` of repo-scoped functions has this shape. */
export interface RepoHost {
  repo: Doc<'repos'>
  provider: ProviderConfig
}

export interface GitProviderAdapter {
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
  /** Yields the repo's most recent pipelines (workflow runs), newest first, for any branch. */
  listPipelines: (
    accessToken: string,
    repo: RepoRef,
  ) => AsyncIterable<Array<CiPipeline>>
  /** The jobs of one pipeline, for pipelines whose commit is no longer a branch head. */
  listPipelineJobs: (
    accessToken: string,
    repo: RepoRef,
    pipeline: Pick<CiPipeline, 'sha' | 'externalId'>,
  ) => Promise<Array<CiJob>>
}

export type CreateAdapter = (provider: ProviderConfig) => GitProviderAdapter
