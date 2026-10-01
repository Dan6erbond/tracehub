import {
  branchUrl,
  commitUrl,
  jobUrl,
  pipelineUrl,
  providerLabel,
  pullUrl,
  repoBaseUrl,
} from './gitProviders/urls'
import type { Doc } from '../_generated/dataModel'
import type {
  CiPage,
  CommitLink,
  HostPage,
  RepoView,
} from '../../src/lib/schemas/host-links'

/**
 * Mappers that add final host URLs to rows, so the frontend never builds one. Each takes the repo the query already loaded
 * and works on single rows, so they compose with page and stream mappers without loading anything.
 */

export type PullRequestWithLinks = Doc<'pullRequests'> & HostPage & CommitLink

export const withRepoLinks = ({
  htmlUrl,
  ...repo
}: Doc<'repos'>): RepoView => ({
  ...repo,
  url: repoBaseUrl({ htmlUrl }),
  providerLabel: providerLabel(repo),
})

export const withBranchLinks = <T extends Doc<'branches'>>(
  repo: Doc<'repos'>,
  branch: T,
): T & HostPage & CommitLink => ({
  ...branch,
  url: branchUrl(repo, branch.name),
  commitUrl: commitUrl(repo, branch.headSha),
})

export const withPullRequestLinks = (
  repo: Doc<'repos'>,
  pullRequest: Doc<'pullRequests'>,
): PullRequestWithLinks => ({
  ...pullRequest,
  url: pullUrl(repo, pullRequest.number),
  commitUrl: commitUrl(repo, pullRequest.headSha),
})

export const withPipelineLinks = <T extends Doc<'ciPipelines'>>(
  repo: Doc<'repos'>,
  pipeline: T,
): T & CiPage & CommitLink => ({
  ...pipeline,
  url: pipelineUrl(repo, pipeline),
  commitUrl: commitUrl(repo, pipeline.sha),
})

/** `pipeline`, when it is the job's own, lets the job link to its page within the pipeline. */
export const withJobLinks = <T extends Doc<'ciJobs'>>(
  repo: Doc<'repos'>,
  job: T,
  pipeline?: Doc<'ciPipelines'> | null,
): T & CiPage & CommitLink => ({
  ...job,
  url: jobUrl(
    repo,
    job,
    pipeline && pipeline._id === job.pipelineId ? pipeline : null,
  ),
  commitUrl: commitUrl(repo, job.sha),
})
