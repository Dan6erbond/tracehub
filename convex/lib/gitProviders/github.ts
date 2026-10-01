import { Octokit } from '@octokit/rest'
import { toHttpUrl } from '../../../src/lib/schemas/url'
import { chunk } from '../chunk'
import { resolveApiUrl } from './apiUrl'
import type { Branch } from '../../../src/lib/schemas/branch'
import type { CiJob } from '../../../src/lib/schemas/ci-job'
import type { CiPipeline } from '../../../src/lib/schemas/ci-pipeline'
import type { CiStatus } from '../../../src/lib/schemas/ci-status'
import type { PullRequest } from '../../../src/lib/schemas/pull-request'
import type { GitProviderAdapter, ProviderConfig } from './types'

interface Connection<TNode> {
  nodes: Array<TNode | null>
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
}

async function* paginate<TNode>(
  fetchPage: (after: string | null) => Promise<Connection<TNode>>,
): AsyncGenerator<Array<TNode>> {
  let after: string | null = null
  do {
    const page: Connection<TNode> = await fetchPage(after)
    yield page.nodes.filter((node): node is TNode => node !== null)
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
  } while (after)
}

const BRANCHES_QUERY = `
  query ($owner: String!, $name: String!, $after: String) {
    repository(owner: $owner, name: $name) {
      refs(refPrefix: "refs/heads/", first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          name
          target {
            ... on Commit {
              oid
              committedDate
              statusCheckRollup { state }
            }
          }
        }
      }
    }
  }
`

const PULL_REQUESTS_QUERY = `
  query ($owner: String!, $name: String!, $after: String) {
    repository(owner: $owner, name: $name) {
      pullRequests(first: 100, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          state
          isDraft
          headRefName
          headRefOid
          baseRefName
          isCrossRepository
          updatedAt
          closedAt
          mergedAt
          author { login }
        }
      }
    }
  }
`

const COMMIT_JOBS_QUERY = `
  query ($owner: String!, $name: String!, $oid: GitObjectID!, $after: String) {
    repository(owner: $owner, name: $name) {
      object(oid: $oid) {
        ... on Commit {
          statusCheckRollup {
            contexts(first: 100, after: $after) {
              pageInfo { hasNextPage endCursor }
              nodes {
                __typename
                ... on CheckRun {
                  databaseId
                  name
                  status
                  conclusion
                  startedAt
                  completedAt
                  checkSuite { workflowRun { databaseId } }
                }
                ... on StatusContext { context state targetUrl }
              }
            }
          }
        }
      }
    }
  }
`

// Newest workflow runs synced per reload; older runs keep whatever status they were last seen with.
const PIPELINE_PAGES = 3

// Commits are fetched this many at a time, well below GitHub's concurrent request limit.
const JOBS_CONCURRENCY = 10

type RollupState = 'SUCCESS' | 'FAILURE' | 'ERROR' | 'PENDING' | 'EXPECTED'

const CI_STATUS: Record<RollupState, CiStatus> = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  ERROR: 'failure',
  PENDING: 'pending',
  EXPECTED: 'pending',
}

interface BranchNode {
  name: string
  target: {
    oid?: string
    committedDate?: string
    statusCheckRollup?: { state: RollupState } | null
  }
}

interface CheckRunNode {
  __typename: 'CheckRun'
  databaseId: number
  name: string
  status: string
  conclusion: string | null
  startedAt: string | null
  completedAt: string | null
  checkSuite: { workflowRun: { databaseId: number } | null }
}

interface StatusContextNode {
  __typename: 'StatusContext'
  context: string
  state: RollupState
  targetUrl: string | null
}

type JobContextNode = CheckRunNode | StatusContextNode

interface CommitJobsResponse {
  repository: {
    object: {
      statusCheckRollup?: { contexts: Connection<JobContextNode> } | null
    } | null
  }
}

const NO_CONTEXTS: Connection<JobContextNode> = {
  nodes: [],
  pageInfo: { hasNextPage: false, endCursor: null },
}

const PASSING_CONCLUSIONS = new Set(['SUCCESS', 'NEUTRAL', 'SKIPPED'])

// Check run and workflow run states arrive upper-case from GraphQL and lower-case from REST.
const toCiStatus = (status: string | null, conclusion: string | null) => {
  if (status?.toUpperCase() !== 'COMPLETED') return 'pending'
  return PASSING_CONCLUSIONS.has((conclusion ?? '').toUpperCase())
    ? 'success'
    : 'failure'
}

const toTime = (value: string | null) => (value ? Date.parse(value) : undefined)

const toJob = (sha: string, node: JobContextNode): CiJob => {
  if (node.__typename === 'StatusContext')
    return {
      sha,
      externalId: node.context,
      name: node.context,
      status: CI_STATUS[node.state],
      url: toHttpUrl(node.targetUrl),
    }
  const { workflowRun } = node.checkSuite
  return {
    sha,
    externalId: String(node.databaseId),
    name: node.name,
    status: toCiStatus(node.status, node.conclusion),
    pipeline: workflowRun ? String(workflowRun.databaseId) : undefined,
    startedAt: toTime(node.startedAt),
    completedAt: toTime(node.completedAt),
  }
}

interface PullRequestNode {
  number: number
  title: string
  isDraft: boolean
  headRefName: string
  headRefOid: string
  baseRefName: string
  isCrossRepository: boolean
  updatedAt: string
  closedAt: string | null
  mergedAt: string | null
  author: { login: string } | null
}

export const createGithubAdapter = (
  provider: ProviderConfig,
): GitProviderAdapter => {
  const baseUrl = resolveApiUrl(provider)
  const createOctokit = (accessToken: string) =>
    new Octokit({ auth: accessToken, baseUrl })
  return {
    listRepositories: async (accessToken) => {
      const octokit = createOctokit(accessToken)
      const repos = await octokit.paginate(
        octokit.rest.repos.listForAuthenticatedUser,
        {
          per_page: 100,
          affiliation: 'owner,collaborator,organization_member',
        },
      )
      return repos.map((repo) => ({
        providerId: provider._id,
        externalId: String(repo.id),
        fullName: repo.full_name,
        owner: repo.owner.login,
        name: repo.name,
        private: repo.private,
        description: repo.description ?? undefined,
        defaultBranch: repo.default_branch,
        pushedAt: repo.pushed_at ? Date.parse(repo.pushed_at) : undefined,
      }))
    },
    listBranches: async function* (accessToken, { owner, name }) {
      const octokit = createOctokit(accessToken)
      const pages = paginate<BranchNode>(async (after) => {
        const { repository } = await octokit.graphql<{
          repository: { refs: Connection<BranchNode> }
        }>(BRANCHES_QUERY, { owner, name, after })
        return repository.refs
      })
      for await (const nodes of pages) {
        const branches: Array<Branch> = []
        for (const { name: branchName, target } of nodes) {
          if (!target.oid || !target.committedDate) continue
          const rollup = target.statusCheckRollup
          branches.push({
            name: branchName,
            headSha: target.oid,
            committedAt: Date.parse(target.committedDate),
            ciStatus: rollup ? CI_STATUS[rollup.state] : undefined,
          })
        }
        yield branches
      }
    },
    listPullRequests: async function* (accessToken, { owner, name }, since) {
      const octokit = createOctokit(accessToken)
      const pages = paginate<PullRequestNode>(async (after) => {
        const { repository } = await octokit.graphql<{
          repository: { pullRequests: Connection<PullRequestNode> }
        }>(PULL_REQUESTS_QUERY, { owner, name, after })
        return repository.pullRequests
      })
      for await (const nodes of pages) {
        const pullRequests: Array<PullRequest> = nodes.map((node) => ({
          number: node.number,
          title: node.title,
          draft: node.isDraft,
          headBranch: node.headRefName,
          headSha: node.headRefOid,
          baseBranch: node.baseRefName,
          fromFork: node.isCrossRepository,
          author: node.author?.login,
          updatedAt: Date.parse(node.updatedAt),
          closedAt: node.closedAt ? Date.parse(node.closedAt) : undefined,
          mergedAt: node.mergedAt ? Date.parse(node.mergedAt) : undefined,
        }))
        const fresh =
          since === undefined
            ? pullRequests
            : pullRequests.filter((pr) => pr.updatedAt >= since)
        if (fresh.length > 0) yield fresh
        if (fresh.length < pullRequests.length) return
      }
    },
    listJobs: async function* (accessToken, { owner, name }, shas) {
      const octokit = createOctokit(accessToken)
      const listCommitJobs = async (sha: string) => {
        const pages = paginate<JobContextNode>(async (after) => {
          const { repository } = await octokit.graphql<CommitJobsResponse>(
            COMMIT_JOBS_QUERY,
            { owner, name, oid: sha, after },
          )
          return repository.object?.statusCheckRollup?.contexts ?? NO_CONTEXTS
        })
        const jobs: Array<CiJob> = []
        for await (const nodes of pages)
          jobs.push(...nodes.map((node) => toJob(sha, node)))
        return jobs
      }
      for (const batch of chunk(shas, JOBS_CONCURRENCY))
        yield (await Promise.all(batch.map(listCommitJobs))).flat()
    },
    listPipelines: async function* (accessToken, { owner, name }) {
      const octokit = createOctokit(accessToken)
      const pages = octokit.paginate.iterator(
        octokit.rest.actions.listWorkflowRunsForRepo,
        { owner, repo: name, per_page: 100 },
      )
      let page = 0
      for await (const { data } of pages) {
        yield data.map((run): CiPipeline => {
          // The typings omit that `head_repository` is null once a fork is deleted.
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          const fromFork = run.head_repository?.id !== run.repository.id
          return {
            sha: run.head_sha,
            externalId: String(run.id),
            name: run.name ?? run.display_title,
            status: toCiStatus(run.status, run.conclusion),
            branch: fromFork ? undefined : (run.head_branch ?? undefined),
            prNumber: run.pull_requests?.[0]?.number,
            trigger: run.event,
            startedAt: Date.parse(run.run_started_at ?? run.created_at),
            completedAt:
              run.status === 'completed'
                ? Date.parse(run.updated_at)
                : undefined,
          }
        })
        if (++page >= PIPELINE_PAGES) return
      }
    },
    listPipelineJobs: async (accessToken, { owner, name }, pipeline) => {
      const octokit = createOctokit(accessToken)
      const jobs = await octokit.paginate(
        octokit.rest.actions.listJobsForWorkflowRun,
        {
          owner,
          repo: name,
          run_id: Number(pipeline.externalId),
          filter: 'latest',
          per_page: 100,
        },
      )
      return jobs.map((job): CiJob => ({
        sha: pipeline.sha,
        externalId: String(job.id),
        name: job.name,
        status: toCiStatus(job.status, job.conclusion),
        pipeline: pipeline.externalId,
        startedAt: Date.parse(job.started_at),
        completedAt: job.completed_at
          ? Date.parse(job.completed_at)
          : undefined,
      }))
    },
  }
}
