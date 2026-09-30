import { z } from 'zod'
import { asyncMap } from 'convex-helpers'
import { zid } from 'convex-helpers/server/zod4'
import { authedQuery, zInternalMutation, zInternalQuery } from './lib/functions'
import { requireRepo } from './lib/requireRepo'
import { pullRequestSchema } from '../src/lib/schemas/pull-request'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'

export const getOpenPullRequestsForBranch = (
  ctx: QueryCtx,
  repoId: Id<'repos'>,
  branchName: string,
) =>
  ctx.db
    .query('pullRequests')
    .withIndex('by_repo_head', (q) =>
      q
        .eq('repoId', repoId)
        .eq('fromFork', false)
        .eq('headBranch', branchName)
        .eq('state', 'open'),
    )
    .collect()

export const getPullRequest = authedQuery({
  args: { repoId: zid('repos'), number: z.number() },
  handler: async (ctx, { repoId, number }) => {
    await requireRepo(ctx, repoId)
    return ctx.db
      .query('pullRequests')
      .withIndex('by_repo_number', (q) =>
        q.eq('repoId', repoId).eq('number', number),
      )
      .unique()
  },
})

export const latestUpdatedAt = zInternalQuery({
  args: { repoId: zid('repos') },
  handler: async (ctx, { repoId }) => {
    const latest = await ctx.db
      .query('pullRequests')
      .withIndex('by_repo_updatedAt', (q) => q.eq('repoId', repoId))
      .order('desc')
      .first()
    return latest?.updatedAt
  },
})

export const upsertPullRequests = zInternalMutation({
  args: {
    repoId: zid('repos'),
    pullRequests: z.array(pullRequestSchema),
  },
  handler: async (ctx, { repoId, pullRequests }) => {
    await asyncMap(pullRequests, async (pullRequest) => {
      const existing = await ctx.db
        .query('pullRequests')
        .withIndex('by_repo_number', (q) =>
          q.eq('repoId', repoId).eq('number', pullRequest.number),
        )
        .unique()
      const doc = { repoId, ...pullRequest }
      if (existing) await ctx.db.replace('pullRequests', existing._id, doc)
      else await ctx.db.insert('pullRequests', doc)
    })
  },
})
