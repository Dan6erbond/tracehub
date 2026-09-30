import { z } from 'zod'
import { asyncMap } from 'convex-helpers'
import { stream } from 'convex-helpers/server/stream'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import schema from './schema'
import { repoQuery, zInternalMutation } from './lib/functions'
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

export const getBranch = repoQuery({
  args: { name: z.string() },
  handler: async (ctx, { repoId, name }) => {
    const branch = await ctx.db
      .query('branches')
      .withIndex('by_repo_name', (q) => q.eq('repoId', repoId).eq('name', name))
      .unique()
    return branch && withOpenPullRequests(ctx, branch)
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
        const withPullRequests = await withOpenPullRequests(ctx, branch)
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
    await asyncMap(branches, async (branch) => {
      const existing = await ctx.db
        .query('branches')
        .withIndex('by_repo_name', (q) =>
          q.eq('repoId', repoId).eq('name', branch.name),
        )
        .unique()
      const doc = { repoId, ...branch, syncedAt }
      if (existing) await ctx.db.replace('branches', existing._id, doc)
      else await ctx.db.insert('branches', doc)
    })
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
