import { z } from 'zod'
import { toHttpUrl } from '../../../src/lib/schemas/url'
import { chunk } from '../chunk'
import { MAX_HEADS_PER_SOURCE } from '../syncLimits'
import { resolveApiUrl } from './apiUrl'
import { combineStatuses } from './ciStatus'
import {
  giteaBranchSchema,
  giteaCombinedStatusSchema,
  giteaPullSchema,
  giteaRepoSchema,
} from './giteaApi'
import { hostFetch } from './hostFetch'
import { parseUrl, repoPagePath } from './repoPagePath'
import { sinceUpdated } from './sinceUpdated'
import { toTime } from './time'
import { isNumericId } from './urls'
import type { CommitState, CommitStatus } from './giteaApi'
import type { ActionsDialect } from './giteaActions'
import type { Branch } from '../../../src/lib/schemas/branch'
import type { CiJob } from '../../../src/lib/schemas/ci-job'
import type { CiPipeline } from '../../../src/lib/schemas/ci-pipeline'
import type { CiStatus } from '../../../src/lib/schemas/ci-status'
import type { PullRequest } from '../../../src/lib/schemas/pull-request'
import type { Repo } from '../../../src/lib/schemas/repo'
import type { GitProviderAdapter, ProviderConfig, RepoRef } from './types'

// The largest page Gitea and Forgejo serve unless an admin raised `[api] MAX_RESPONSE_ITEMS`; larger requests are clamped.
const PAGE_SIZE = 50

// Newest runs synced per reload; older runs keep whatever status they were last seen with.
const PIPELINE_PAGES = 3

const CONCURRENCY = 10

// Gitea answers 403 for a repo with Actions turned off and the versions without the endpoints 404, 405 or 501.
const ACTIONS_UNAVAILABLE = new Set([403, 404, 405, 501])

const NEXT_PAGE = /rel="next"/

// Gitea counts a warning as failing when it combines the states of a commit.
const COMMIT_STATUS: Record<CommitState, CiStatus> = {
  pending: 'pending',
  success: 'success',
  skipped: 'success',
  error: 'failure',
  failure: 'failure',
  warning: 'failure',
}

type Params = Record<string, string | number>

const createClient = (apiUrl: string, accessToken: string) => {
  const request = (path: string, params: Params) => {
    const url = new URL(apiUrl + path)
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, String(value))
    return hostFetch(url, accessToken)
  }

  const ensureOk = (response: Response) => {
    if (!response.ok)
      throw new Error(`GET ${response.url} answered ${response.status}`)
    return response
  }

  const read = async <T>(response: Response, parse: (body: unknown) => T) => {
    try {
      return parse(await response.json())
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new Error(
          `GET ${response.url} answered an unexpected body: ${z.prettifyError(error)}`,
        )
      throw error
    }
  }

  return {
    read,
    /** `undefined` where the host has no Actions API for the repo. */
    getActions: async (path: string, params: Params) => {
      const response = await request(path, params)
      if (response.status === 403)
        console.warn(
          `GET ${response.url} answered 403, so the repo counts as having no pipelines`,
        )
      return ACTIONS_UNAVAILABLE.has(response.status)
        ? undefined
        : ensureOk(response)
    },
    /** Follows the `Link` header, since a host may serve smaller pages than asked for. */
    pages: async function* <T extends z.ZodType>(
      path: string,
      schema: T,
      params: Params = {},
    ) {
      for (let page = 1; ; page++) {
        const response = ensureOk(
          await request(path, { ...params, page, limit: PAGE_SIZE }),
        )
        yield await read(response, (body) => schema.parse(body))
        if (!NEXT_PAGE.test(response.headers.get('link') ?? '')) return
      }
    },
  }
}

type Client = ReturnType<typeof createClient>

const repoPath = ({ owner, name }: RepoRef) =>
  `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`

const inBatches = async <T, TResult>(
  items: Array<T>,
  fn: (item: T) => Promise<TResult>,
) => {
  const results: Array<TResult> = []
  for (const batch of chunk(items, CONCURRENCY))
    results.push(...(await Promise.all(batch.map(fn))))
  return results
}

const toCommitStatus = (statuses: Array<CommitStatus>) =>
  combineStatuses(statuses.map(({ status }) => COMMIT_STATUS[status]))

const toPullRequest = ({
  number,
  title,
  draft,
  head,
  base,
  user,
  updated_at,
  closed_at,
  merged_at,
}: z.infer<typeof giteaPullSchema>): PullRequest => ({
  number,
  title,
  draft,
  headBranch: head.ref,
  headSha: head.sha,
  baseBranch: base.ref,
  fromFork: head.repo_id !== base.repo_id,
  author: user?.login,
  updatedAt: Date.parse(updated_at),
  closedAt: toTime(closed_at),
  mergedAt: toTime(merged_at),
})

/** One adapter for Gitea and Forgejo, which share the REST API except for the Actions endpoints that `actions` reads. */
export const createGiteaAdapter =
  (actions: ActionsDialect) =>
  (provider: ProviderConfig): GitProviderAdapter => {
    const apiUrl = resolveApiUrl(provider)
    const host = new URL(provider.baseUrl)

    // An adapter serves one reload, which asks for the statuses of a head from the branch sync and again from the job sync.
    const statusesBySha = new Map<string, Promise<Array<CommitStatus>>>()

    const loadStatuses = async (client: Client, repo: RepoRef, sha: string) => {
      const statuses: Array<CommitStatus> = []
      for await (const page of client.pages(
        `${repoPath(repo)}/commits/${sha}/status`,
        giteaCombinedStatusSchema,
      ))
        statuses.push(...page.statuses)
      return statuses
    }

    const commitStatuses = (client: Client, repo: RepoRef, sha: string) => {
      const key = `${repoPath(repo)}@${sha}`
      const cached = statusesBySha.get(key)
      if (cached) return cached
      const loading = loadStatuses(client, repo, sha)
      statusesBySha.set(key, loading)
      return loading
    }

    /** The page a status links to: a path when it is one of the host's own, else its URL. */
    const toStatusJob = (
      repo: RepoRef,
      sha: string,
      { context, status, target_url }: CommitStatus,
    ): CiJob => {
      const target = target_url
        ? parseUrl(target_url, `${provider.baseUrl}/`)
        : undefined
      const webPath =
        target?.origin === host.origin ? repoPagePath(target, repo) : undefined
      return {
        sha,
        externalId: context,
        name: context,
        status: COMMIT_STATUS[status],
        webPath,
        url: webPath === undefined ? toHttpUrl(target?.href) : undefined,
      }
    }

    async function* runPages(
      client: Client,
      repo: RepoRef,
      params: Params,
      maxPages: number,
    ) {
      let seen = 0
      for (let page = 1; page <= maxPages; page++) {
        const response = await client.getActions(
          `${repoPath(repo)}/actions/runs`,
          { ...params, page, limit: PAGE_SIZE },
        )
        if (!response) return
        const { total, pipelines } = await client.read(response, (body) =>
          actions.parseRuns(body, repo),
        )
        if (pipelines.length === 0) return
        yield pipelines
        seen += pipelines.length
        if (seen >= total) return
      }
    }

    const pipelineJobs = async (
      client: Client,
      repo: RepoRef,
      pipeline: Pick<CiPipeline, 'sha' | 'externalId' | 'webPath'>,
    ) => {
      if (!isNumericId(pipeline.externalId)) return []
      const jobs: Array<CiJob> = []
      for (let page = 1; ; page++) {
        const response = await client.getActions(
          `${repoPath(repo)}/actions/runs/${pipeline.externalId}/jobs`,
          { page, limit: PAGE_SIZE },
        )
        if (!response) return jobs
        const parsed = await client.read(response, (body) =>
          actions.parseJobs(body, pipeline, repo),
        )
        jobs.push(...parsed.jobs)
        if (parsed.jobs.length === 0 || jobs.length >= parsed.total) return jobs
      }
    }

    const listCommitJobs = async (
      client: Client,
      repo: RepoRef,
      sha: string,
    ) => {
      const runJobs: Array<CiJob> = []
      for await (const pipelines of runPages(
        client,
        repo,
        { head_sha: sha },
        1,
      ))
        runJobs.push(
          ...(
            await Promise.all(
              pipelines.map((pipeline) => pipelineJobs(client, repo, pipeline)),
            )
          ).flat(),
        )
      const runJobPages = new Set(
        runJobs.flatMap(({ webPath }) => webPath ?? []),
      )
      // Actions also posts a status per job; those of the jobs loaded above would list them twice.
      const statusJobs = (await commitStatuses(client, repo, sha))
        .map((status) => toStatusJob(repo, sha, status))
        .filter(
          ({ webPath }) => webPath === undefined || !runJobPages.has(webPath),
        )
      return [...runJobs, ...statusJobs]
    }

    return {
      listRepositories: async (accessToken) => {
        const repos: Array<Repo> = []
        for await (const page of createClient(apiUrl, accessToken).pages(
          '/user/repos',
          z.array(giteaRepoSchema),
        ))
          repos.push(
            ...page.map((repo) => ({
              providerId: provider._id,
              externalId: String(repo.id),
              fullName: repo.full_name,
              owner: repo.owner.login,
              name: repo.name,
              private: repo.private,
              description: repo.description || undefined,
              defaultBranch: repo.default_branch || undefined,
              pushedAt: toTime(repo.updated_at),
            })),
          )
        return repos
      },
      // Every branch costs a request for its statuses, so only the most recently committed ones, which are the heads the job sync looks at, get a CI status.
      listBranches: async function* (accessToken, repo) {
        const client = createClient(apiUrl, accessToken)
        const heads: Array<Omit<Branch, 'ciStatus'>> = []
        for await (const page of client.pages(
          `${repoPath(repo)}/branches`,
          z.array(giteaBranchSchema),
        ))
          for (const { name, commit } of page) {
            const committedAt = toTime(commit?.timestamp)
            if (commit && committedAt !== undefined)
              heads.push({ name, headSha: commit.id, committedAt })
          }
        const recent = new Set(
          [...heads]
            .sort((a, b) => b.committedAt - a.committedAt)
            .slice(0, MAX_HEADS_PER_SOURCE)
            .map(({ name }) => name),
        )
        for (const batch of chunk(heads, PAGE_SIZE))
          yield await inBatches(batch, async (head): Promise<Branch> => ({
            ...head,
            ciStatus: recent.has(head.name)
              ? toCommitStatus(await commitStatuses(client, repo, head.headSha))
              : undefined,
          }))
      },
      listPullRequests: (accessToken, repo, since) => {
        const client = createClient(apiUrl, accessToken)
        async function* pullRequestPages() {
          for await (const page of client.pages(
            `${repoPath(repo)}/pulls`,
            z.array(giteaPullSchema),
            { state: 'all', sort: 'recentupdate' },
          ))
            yield page.map(toPullRequest)
        }
        return sinceUpdated(pullRequestPages(), since)
      },
      listJobs: async function* (accessToken, repo, shas) {
        const client = createClient(apiUrl, accessToken)
        for (const batch of chunk(shas, CONCURRENCY))
          yield (
            await Promise.all(
              batch.map((sha) => listCommitJobs(client, repo, sha)),
            )
          ).flat()
      },
      listPipelines: async function* (accessToken, repo) {
        yield* runPages(
          createClient(apiUrl, accessToken),
          repo,
          {},
          PIPELINE_PAGES,
        )
      },
      listPipelineJobs: (accessToken, repo, pipeline) =>
        pipelineJobs(createClient(apiUrl, accessToken), repo, pipeline),
    }
  }
