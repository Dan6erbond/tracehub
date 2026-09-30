import { z } from 'zod'
import { asyncMap } from 'convex-helpers'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import { repoQuery, zInternalMutation, zInternalQuery } from './lib/functions'
import { pullRequestSchema } from '../src/lib/schemas/pull-request'
import type { Doc } from './_generated/dataModel'

export const listOpenForBranch = zInternalQuery({
  args: { repoId: zid('repos'), branchName: z.string() },
  handler: (ctx, { repoId, branchName }) =>
    ctx.db
      .query('pullRequests')
      .withIndex('by_repo_head', (q) =>
        q
          .eq('repoId', repoId)
          .eq('fromFork', false)
          .eq('headBranch', branchName)
          .eq('state', 'open'),
      )
      .collect(),
})

export const getByNumber = zInternalQuery({
  args: { repoId: zid('repos'), number: z.number() },
  handler: (ctx, { repoId, number }) =>
    ctx.db
      .query('pullRequests')
      .withIndex('by_repo_number', (q) =>
        q.eq('repoId', repoId).eq('number', number),
      )
      .unique(),
})

export const getPullRequest = repoQuery({
  args: { number: z.number() },
  handler: (ctx, { repoId, number }): Promise<Doc<'pullRequests'> | null> =>
    ctx.runQuery(internal.pullRequests.getByNumber, { repoId, number }),
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
