import { Octokit } from '@octokit/rest'
import type { Branch, CiStatus } from '../../../src/lib/schemas/branch'
import type {
  PullRequest,
  PullRequestState,
} from '../../../src/lib/schemas/pull-request'
import type { GitProviderAdapter } from './types'

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
          url
          updatedAt
          author { login }
        }
      }
    }
  }
`

type RollupState = 'SUCCESS' | 'FAILURE' | 'ERROR' | 'PENDING' | 'EXPECTED'

const CI_STATUS: Record<RollupState, CiStatus> = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  ERROR: 'failure',
  PENDING: 'pending',
  EXPECTED: 'pending',
}

const PULL_REQUEST_STATE: Record<string, PullRequestState> = {
  OPEN: 'open',
  CLOSED: 'closed',
  MERGED: 'merged',
}

interface BranchNode {
  name: string
  target: {
    oid?: string
    committedDate?: string
    statusCheckRollup?: { state: RollupState } | null
  }
}

interface PullRequestNode {
  number: number
  title: string
  state: string
  isDraft: boolean
  headRefName: string
  headRefOid: string
  baseRefName: string
  isCrossRepository: boolean
  url: string
  updatedAt: string
  author: { login: string } | null
}

export const githubAdapter: GitProviderAdapter = {
  authProviderId: 'github',
  listRepositories: async (accessToken) => {
    const octokit = new Octokit({ auth: accessToken })
    const repos = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      { per_page: 100, affiliation: 'owner,collaborator,organization_member' },
    )
    return repos.map((repo) => ({
      provider: 'github',
      externalId: String(repo.id),
      fullName: repo.full_name,
      owner: repo.owner.login,
      name: repo.name,
      private: repo.private,
      htmlUrl: repo.html_url,
      description: repo.description ?? undefined,
      defaultBranch: repo.default_branch,
      pushedAt: repo.pushed_at ? Date.parse(repo.pushed_at) : undefined,
    }))
  },
  listBranches: async function* (accessToken, { owner, name }) {
    const octokit = new Octokit({ auth: accessToken })
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
    const octokit = new Octokit({ auth: accessToken })
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
        state: PULL_REQUEST_STATE[node.state],
        draft: node.isDraft,
        headBranch: node.headRefName,
        headSha: node.headRefOid,
        baseBranch: node.baseRefName,
        fromFork: node.isCrossRepository,
        author: node.author?.login,
        htmlUrl: node.url,
        updatedAt: Date.parse(node.updatedAt),
      }))
      const fresh =
        since === undefined
          ? pullRequests
          : pullRequests.filter((pr) => pr.updatedAt >= since)
      if (fresh.length > 0) yield fresh
      if (fresh.length < pullRequests.length) return
    }
  },
}
