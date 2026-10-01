import { toCiStatus } from './ciStatus'
import {
  forgejoJobsSchema,
  forgejoRunsSchema,
  giteaJobsSchema,
  giteaRunsSchema,
} from './giteaApi'
import { reportedPagePath } from './repoPagePath'
import { firstTimeOrNow, toTime } from './time'
import type { ForgejoRun, GiteaRun } from './giteaApi'
import type { CiJob } from '../../../src/lib/schemas/ci-job'
import type { CiPipeline } from '../../../src/lib/schemas/ci-pipeline'
import type { CiStatus } from '../../../src/lib/schemas/ci-status'
import type { RepoRef } from './types'

type PipelineRef = Pick<CiPipeline, 'sha' | 'externalId' | 'webPath'>

/** The Actions API differs between Gitea and Forgejo, so each turns its own answers into pipelines and jobs. */
export interface ActionsDialect {
  parseRuns: (
    body: unknown,
    repo: RepoRef,
  ) => { total: number; pipelines: Array<CiPipeline> }
  parseJobs: (
    body: unknown,
    pipeline: PipelineRef,
    repo: RepoRef,
  ) => { total: number; jobs: Array<CiJob> }
}

const toGiteaPipeline = (
  {
    id,
    display_title,
    head_sha,
    head_branch,
    event,
    status,
    conclusion,
    html_url,
    created_at,
    updated_at,
    started_at,
    completed_at,
    pull_requests,
    repository,
    head_repository,
  }: GiteaRun,
  repo: RepoRef,
): CiPipeline => {
  const ciStatus = toCiStatus(status, conclusion)
  const fromFork =
    head_repository?.id !== undefined && head_repository.id !== repository?.id
  return {
    sha: head_sha,
    externalId: String(id),
    name: display_title,
    status: ciStatus,
    // Runs of pull requests have no branch, since they run on the pull request's ref.
    branch: fromFork ? undefined : head_branch || undefined,
    prNumber: pull_requests?.[0]?.number,
    trigger: event ?? undefined,
    webPath: reportedPagePath(html_url, repo),
    startedAt: firstTimeOrNow(started_at, created_at, updated_at),
    completedAt: ciStatus === 'pending' ? undefined : toTime(completed_at),
  }
}

/** Gitea 1.25 and later. Run and job pages are numbered differently per version, so their links come from `html_url`. */
export const giteaActions: ActionsDialect = {
  parseRuns: (body, repo) => {
    const { total_count, workflow_runs } = giteaRunsSchema.parse(body)
    return {
      total: total_count,
      pipelines: workflow_runs.map((run) => toGiteaPipeline(run, repo)),
    }
  },
  parseJobs: (body, { sha, externalId }, repo) => {
    const { total_count, jobs } = giteaJobsSchema.parse(body)
    return {
      total: total_count,
      jobs: jobs.map(
        ({
          id,
          name,
          status,
          conclusion,
          html_url,
          started_at,
          completed_at,
        }) => ({
          sha,
          externalId: String(id),
          name,
          status: toCiStatus(status, conclusion),
          pipeline: externalId,
          webPath: reportedPagePath(html_url, repo),
          startedAt: toTime(started_at),
          completedAt: toTime(completed_at),
        }),
      ),
    }
  },
}

const toForgejoStatus = (status: string): CiStatus => {
  if (status === 'success' || status === 'skipped') return 'success'
  if (status === 'failure' || status === 'cancelled') return 'failure'
  return 'pending'
}

const PULL_REF = /^#(\d+)/

// Events that run on a branch's own ref. A pull request event carries the base branch for `pull_request_target`, and a push event may as well be a tag, which the sync filters out as an unknown branch.
const BRANCH_EVENTS = new Set(['push', 'schedule', 'workflow_dispatch'])

const toForgejoPipeline = (
  {
    id,
    title,
    commit_sha,
    prettyref,
    event,
    trigger_event,
    status,
    html_url,
    is_fork_pull_request,
    created,
    started,
    stopped,
  }: ForgejoRun,
  repo: RepoRef,
): CiPipeline => {
  const ciStatus = toForgejoStatus(status)
  const pullNumber = PULL_REF.exec(prettyref)?.[1]
  const onBranch = BRANCH_EVENTS.has(event) && !is_fork_pull_request
  return {
    sha: commit_sha,
    externalId: String(id),
    name: title,
    status: ciStatus,
    branch: onBranch ? prettyref || undefined : undefined,
    prNumber: pullNumber === undefined ? undefined : Number(pullNumber),
    trigger: trigger_event ?? (event || undefined),
    webPath: reportedPagePath(html_url, repo),
    startedAt: firstTimeOrNow(started, created),
    completedAt: ciStatus === 'pending' ? undefined : toTime(stopped),
  }
}

/** Forgejo 12 and later list runs, 16 and later their jobs. A job without `html_url` is the run's page plus the job's position, which is how Forgejo numbers them. */
export const forgejoActions: ActionsDialect = {
  parseRuns: (body, repo) => {
    const { total_count, workflow_runs } = forgejoRunsSchema.parse(body)
    return {
      total: total_count,
      pipelines: workflow_runs.map((run) => toForgejoPipeline(run, repo)),
    }
  },
  parseJobs: (body, { sha, externalId, webPath }, repo) => {
    const jobs = forgejoJobsSchema.parse(body)
    return {
      total: jobs.length,
      jobs: jobs.map(({ id, name, status, html_url }, index) => ({
        sha,
        externalId: String(id),
        name,
        status: toForgejoStatus(status),
        pipeline: externalId,
        webPath:
          reportedPagePath(html_url, repo) ??
          (webPath === undefined ? undefined : `${webPath}/jobs/${index}`),
      })),
    }
  },
}
