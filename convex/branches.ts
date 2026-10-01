import { z } from 'zod'
import { asyncMap } from 'convex-helpers'
import { stream } from 'convex-helpers/server/stream'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import schema from './schema'
import { repoQuery, zInternalMutation, zInternalQuery } from './lib/functions'
import { withBranchLinks, withPullRequestLinks } from './lib/hostLinks'
import { replaceOrInsert, uniqueBy } from './lib/upsert'
import { branchSchema } from '../src/lib/schemas/branch'
import { paginationOptsSchema } from '../src/lib/schemas/pagination'
import type { PullRequestWithLinks } from './lib/hostLinks'
import type { CommitLink, HostPage } from '../src/lib/schemas/host-links'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'

const PRUNE_BATCH_SIZE = 500

// Each scanned branch costs a pull request lookup; the cap keeps a sparse filter under Convex's per-function query limit.
const MAX_BRANCHES_SCANNED_PER_PAGE = 500

const withOpenPullRequests = async <T extends Doc<'branches'>>(
  ctx: QueryCtx,
  repo: Doc<'repos'>,
  branch: T,
) => {
  const pullRequests: Array<Doc<'pullRequests'>> = await ctx.runQuery(
    internal.pullRequests.listOpenForBranch,
    { repoId: branch.repoId, branchName: branch.name },
  )
  return {
    ...branch,
    pullRequests: pullRequests.map((pullRequest) =>
      withPullRequestLinks(repo, pullRequest),
    ),
  }
}

/** The CI status of a branch is that of its latest pipeline, falling back to the host's rollup of the head commit (commit statuses). */
const withCiStatus = async <T extends Doc<'branches'>>(
  ctx: QueryCtx,
  branch: T,
): Promise<T> => {
  const latest: Doc<'ciPipelines'> | null = await ctx.runQuery(
    internal.ciPipelines.latestForBranch,
    { repoId: branch.repoId, branch: branch.name },
  )
  return { ...branch, ciStatus: latest?.status ?? branch.ciStatus }
}

export type BranchWithDetails = Doc<'branches'> &
  HostPage &
  CommitLink & { pullRequests: Array<PullRequestWithLinks> }

const withBranchDetails = async (
  ctx: QueryCtx,
  repo: Doc<'repos'>,
  branch: Doc<'branches'>,
): Promise<BranchWithDetails> => {
  const [{ ciStatus }, withPullRequests] = await Promise.all([
    withCiStatus(ctx, branch),
    withOpenPullRequests(ctx, repo, branch),
  ])
  return withBranchLinks(repo, { ...withPullRequests, ciStatus })
}

export const findByName = zInternalQuery({
  args: { repoId: zid('repos'), name: z.string() },
  handler: (ctx, { repoId, name }) =>
    ctx.db
      .query('branches')
      .withIndex('by_repo_name', (q) => q.eq('repoId', repoId).eq('name', name))
      .unique(),
})

export const getBranch = repoQuery({
  args: { name: z.string() },
  handler: async (ctx, { repoId, name }): Promise<BranchWithDetails | null> => {
    const branch: Doc<'branches'> | null = await ctx.runQuery(
      internal.branches.findByName,
      { repoId, name },
    )
    return branch && withBranchDetails(ctx, ctx.repo, branch)
  },
})

export const listBranches = repoQuery({
  args: {
    openPullRequestsOnly: z.boolean(),
    paginationOpts: paginationOptsSchema,
  },
  handler: (ctx, { repoId, openPullRequestsOnly, paginationOpts }) =>
    stream(ctx.db, schema)
      .query('branches')
      .withIndex('by_repo_committedAt', (q) => q.eq('repoId', repoId))
      .order('desc')
      .map(async (branch): Promise<BranchWithDetails | null> => {
        const withPullRequests = await withOpenPullRequests(
          ctx,
          ctx.repo,
          branch,
        )
        if (openPullRequestsOnly && withPullRequests.pullRequests.length === 0)
          return null
        return withBranchLinks(
          ctx.repo,
          await withCiStatus(ctx, withPullRequests),
        )
      })
      .paginate({
        ...paginationOpts,
        maximumRowsRead: MAX_BRANCHES_SCANNED_PER_PAGE,
      }),
})

export const upsertBranches = zInternalMutation({
  args: {
    repoId: zid('repos'),
    branches: z.array(branchSchema),
    syncedAt: z.number(),
  },
  handler: async (ctx, { repoId, branches, syncedAt }) => {
    await asyncMap(
      uniqueBy(branches, ({ name }) => name),
      async (branch) => {
        const existing: Doc<'branches'> | null = await ctx.runQuery(
          internal.branches.findByName,
          { repoId, name: branch.name },
        )
        // Replacing also clears `remoteDeletedAt`: a branch the host lists again is live again.
        return replaceOrInsert(ctx, 'branches', existing, {
          repoId,
          ...branch,
          syncedAt,
          createdBy: existing?.createdBy,
        })
      },
    )
  },
})

/** The branch an upload runs on, created when no sync has reported it yet; the next sync replaces it, keeping the id. */
export const ensureBranch = zInternalMutation({
  args: {
    repoId: zid('repos'),
    name: z.string(),
    headSha: z.string(),
    createdBy: z.string(),
  },
  handler: async (ctx, { repoId, name, headSha, createdBy }) => {
    const existing: Doc<'branches'> | null = await ctx.runQuery(
      internal.branches.findByName,
      { repoId, name },
    )
    if (!existing)
      await ctx.db.insert('branches', {
        repoId,
        name,
        headSha,
        committedAt: Date.now(),
        createdBy,
      })
  },
})

/**
 * Handles branches the host no longer lists (synced, but not touched since `before`): deletes those without runs,
 * marks the rest as deleted on the remote. Returns whether more remain.
 */
export const pruneBranches = zInternalMutation({
  args: { repoId: zid('repos'), before: z.number() },
  handler: async (ctx, { repoId, before }) => {
    const stale = await ctx.db
      .query('branches')
      .withIndex('by_repo_remoteDeletedAt_syncedAt', (q) =>
        q
          .eq('repoId', repoId)
          .eq('remoteDeletedAt', undefined)
          .gt('syncedAt', undefined)
          .lt('syncedAt', before),
      )
      .take(PRUNE_BATCH_SIZE)
    await asyncMap(stale, async (branch) => {
      const hasRuns: boolean = await ctx.runQuery(
        internal.runs.existsOnBranch,
        { repoId, branch: branch.name },
      )
      if (hasRuns)
        await ctx.db.patch('branches', branch._id, {
          remoteDeletedAt: Date.now(),
        })
      else await ctx.db.delete('branches', branch._id)
    })
    return stale.length === PRUNE_BATCH_SIZE
  },
})
