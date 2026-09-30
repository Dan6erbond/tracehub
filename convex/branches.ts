import { z } from 'zod'
import { stream } from 'convex-helpers/server/stream'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import schema from './schema'
import { repoQuery, zInternalMutation, zInternalQuery } from './lib/functions'
import { replaceOrInsert } from './lib/upsert'
import { branchSchema } from '../src/lib/schemas/branch'
import { paginationOptsSchema } from '../src/lib/schemas/pagination'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'

const PRUNE_BATCH_SIZE = 500

// Each scanned branch costs a pull request lookup; the cap keeps a sparse filter under Convex's per-function query limit.
const MAX_BRANCHES_SCANNED_PER_PAGE = 500

const withOpenPullRequests = async (ctx: QueryCtx, branch: Doc<'branches'>) => {
  const pullRequests: Array<Doc<'pullRequests'>> = await ctx.runQuery(
    internal.pullRequests.listOpenForBranch,
    { repoId: branch.repoId, branchName: branch.name },
  )
  return { ...branch, pullRequests }
}

/** The CI status of a branch is that of its latest pipeline, falling back to the host's rollup of the head commit (commit statuses). */
const withCiStatus = async (
  ctx: QueryCtx,
  branch: Doc<'branches'>,
): Promise<Doc<'branches'>> => {
  const latest: Doc<'ciPipelines'> | null = await ctx.runQuery(
    internal.ciPipelines.latestForBranch,
    { repoId: branch.repoId, branch: branch.name },
  )
  return { ...branch, ciStatus: latest?.status ?? branch.ciStatus }
}

export type BranchWithDetails = Doc<'branches'> & {
  pullRequests: Array<Doc<'pullRequests'>>
}

const withBranchDetails = async (
  ctx: QueryCtx,
  branch: Doc<'branches'>,
): Promise<BranchWithDetails> =>
  withOpenPullRequests(ctx, await withCiStatus(ctx, branch))

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
    return branch && withBranchDetails(ctx, branch)
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
      .map(async (branch) => {
        const withPullRequests = await withBranchDetails(ctx, branch)
        if (openPullRequestsOnly && withPullRequests.pullRequests.length === 0)
          return null
        return withPullRequests
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
    for (const branch of branches) {
      const existing: Doc<'branches'> | null = await ctx.runQuery(
        internal.branches.findByName,
        { repoId, name: branch.name },
      )
      await replaceOrInsert(ctx, 'branches', existing, {
        repoId,
        ...branch,
        syncedAt,
      })
    }
  },
})

/** Deletes branches the host no longer lists (not touched since `before`); returns whether more remain. */
export const pruneBranches = zInternalMutation({
  args: { repoId: zid('repos'), before: z.number() },
  handler: async (ctx, { repoId, before }) => {
    const stale = await ctx.db
      .query('branches')
      .withIndex('by_repo_syncedAt', (q) =>
        q.eq('repoId', repoId).lt('syncedAt', before),
      )
      .take(PRUNE_BATCH_SIZE)
    for (const branch of stale) await ctx.db.delete('branches', branch._id)
    return stale.length === PRUNE_BATCH_SIZE
  },
})
