import {
  branchUrl,
  commitUrl,
  jobUrl,
  pipelineUrl,
  pullUrl,
  repoBaseUrl,
} from './gitProviders/urls'
import type { Doc } from '../_generated/dataModel'
import type { ProviderConfig, RepoHost } from './gitProviders/types'
import type {
  CiPage,
  CommitLink,
  HostPage,
  RepoView,
} from '../../src/lib/schemas/host-links'

/**
 * Mappers that add final host URLs to rows, so the frontend never builds one. Each takes the repo and provider the query already loaded
 * and works on single rows, so they compose with page and stream mappers without loading anything.
 */

export type PullRequestWithLinks = Doc<'pullRequests'> & HostPage & CommitLink

export const withRepoLinks = (
  repo: Doc<'repos'>,
  provider: ProviderConfig,
): RepoView => ({
  ...repo,
  url: repoBaseUrl(repo, provider),
  providerName: provider.name,
})

export const withBranchLinks = <T extends Doc<'branches'>>(
  host: RepoHost,
  branch: T,
): T & HostPage & CommitLink => ({
  ...branch,
  url: branchUrl(host, branch.name),
  commitUrl: commitUrl(host, branch.headSha),
})

export const withPullRequestLinks = (
  host: RepoHost,
  pullRequest: Doc<'pullRequests'>,
): PullRequestWithLinks => ({
  ...pullRequest,
  url: pullUrl(host, pullRequest.number),
  commitUrl: commitUrl(host, pullRequest.headSha),
})

export const withPipelineLinks = <T extends Doc<'ciPipelines'>>(
  host: RepoHost,
  pipeline: T,
): T & CiPage & CommitLink => ({
  ...pipeline,
  url: pipelineUrl(host, pipeline),
  commitUrl: commitUrl(host, pipeline.sha),
})

/** `pipeline`, when it is the job's own, lets the job link to its page within the pipeline. */
export const withJobLinks = <T extends Doc<'ciJobs'>>(
  host: RepoHost,
  job: T,
  pipeline?: Doc<'ciPipelines'> | null,
): T & CiPage & CommitLink => ({
  ...job,
  url: jobUrl(
    host,
    job,
    pipeline && pipeline._id === job.pipelineId ? pipeline : null,
  ),
  commitUrl: commitUrl(host, job.sha),
})
