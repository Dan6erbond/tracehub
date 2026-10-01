import { z } from 'zod'
import { asyncMap } from 'convex-helpers'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import { repoQuery, zInternalMutation, zInternalQuery } from './lib/functions'
import { withPullRequestLinks } from './lib/hostLinks'
import { replaceOrInsert, uniqueBy } from './lib/upsert'
import { pullRequestSchema } from '../src/lib/schemas/pull-request'
import type { Doc } from './_generated/dataModel'
import type { PullRequestWithLinks } from './lib/hostLinks'

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
  handler: async (
    ctx,
    { repoId, number },
  ): Promise<PullRequestWithLinks | null> => {
    const pullRequest: Doc<'pullRequests'> | null = await ctx.runQuery(
      internal.pullRequests.getByNumber,
      { repoId, number },
    )
    return pullRequest && withPullRequestLinks(ctx.repo, pullRequest)
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
    await asyncMap(
      uniqueBy(pullRequests, ({ number }) => String(number)),
      async (pullRequest) => {
        const existing: Doc<'pullRequests'> | null = await ctx.runQuery(
          internal.pullRequests.getByNumber,
          { repoId, number: pullRequest.number },
        )
        return replaceOrInsert(ctx, 'pullRequests', existing, {
          repoId,
          ...pullRequest,
        })
      },
    )
  },
})
