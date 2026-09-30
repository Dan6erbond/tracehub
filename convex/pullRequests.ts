import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import { repoQuery, zInternalMutation, zInternalQuery } from './lib/functions'
import { replaceOrInsert } from './lib/upsert'
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
          .eq('closedAt', undefined),
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
    for (const pullRequest of pullRequests) {
      const existing: Doc<'pullRequests'> | null = await ctx.runQuery(
        internal.pullRequests.getByNumber,
        { repoId, number: pullRequest.number },
      )
      await replaceOrInsert(ctx, 'pullRequests', existing, {
        repoId,
        ...pullRequest,
      })
    }
  },
})
