import { z } from 'zod'
import { asyncMap } from 'convex-helpers'
import { stream } from 'convex-helpers/server/stream'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import schema from './schema'
import {
  authedAction,
  authedQuery,
  repoAction,
  zInternalMutation,
  zInternalQuery,
} from './lib/functions'
import { chunk } from './lib/chunk'
import { getProviderAccessToken } from './lib/gitProviders/getAccessToken'
import { gitProviders } from './lib/gitProviders'
import { loadRepositories } from './lib/gitProviders/loadRepositories'
import { repoActivityAt } from './lib/repoActivity'
import { replaceOrInsert } from './lib/upsert'
import { paginationOptsSchema } from '../src/lib/schemas/pagination'
import { gitProviderSchema, repoSchema } from '../src/lib/schemas/repo'
import type { PullRequest } from '../src/lib/schemas/pull-request'
import type { Doc, Id } from './_generated/dataModel'

const PRUNE_JOBS_SHA_BATCH_SIZE = 25

export const listRepos = authedQuery({
  args: { search: z.string().optional(), paginationOpts: paginationOptsSchema },
  handler: async (ctx, { search, paginationOpts }) => {
    const term = search?.trim()
    const getRepoOfLink = (link: Doc<'userRepos'>) =>
      ctx.db.get('repos', link.repoId)
    if (term) {
      // Streams can't wrap a search index; results are ordered by relevance, not by activity.
      const links = await ctx.db
        .query('userRepos')
        .withSearchIndex('search_fullName', (q) =>
          q.search('fullName', term).eq('userId', ctx.userId),
        )
        .paginate(paginationOpts)
      const repos = await asyncMap(links.page, getRepoOfLink)
      return { ...links, page: repos.filter((repo) => repo !== null) }
    }
    return stream(ctx.db, schema)
      .query('userRepos')
      .withIndex('by_user_activityAt', (q) => q.eq('userId', ctx.userId))
      .order('desc')
      .map(getRepoOfLink)
      .paginate(paginationOpts)
  },
})

export const findByExternalId = zInternalQuery({
  args: { provider: gitProviderSchema, externalId: z.string() },
  handler: (ctx, { provider, externalId }) =>
    ctx.db
      .query('repos')
      .withIndex('by_provider_externalId', (q) =>
        q.eq('provider', provider).eq('externalId', externalId),
      )
      .unique(),
})

export const upsertRepo = zInternalMutation({
  args: { repo: repoSchema },
  handler: async (ctx, { repo }): Promise<Id<'repos'>> => {
    const existing: Doc<'repos'> | null = await ctx.runQuery(
      internal.repos.findByExternalId,
      { provider: repo.provider, externalId: repo.externalId },
    )
    return replaceOrInsert(ctx, 'repos', existing, repo)
  },
})

export const syncUserRepos = zInternalMutation({
  args: {
    userId: z.string(),
    providers: z.array(gitProviderSchema),
    repos: z.array(repoSchema),
  },
  handler: async (ctx, { userId, providers, repos }) => {
    const accessible = new Set<string>()
    for (const repo of repos) {
      const repoId = await ctx.runMutation(internal.repos.upsertRepo, { repo })
      accessible.add(repoId)
      const stored = await ctx.db.get('repos', repoId)
      const activityAt = stored ? repoActivityAt(stored) : undefined
      const link = await ctx.db
        .query('userRepos')
        .withIndex('by_user_repo', (q) =>
          q.eq('userId', userId).eq('repoId', repoId),
        )
        .unique()
      if (!link)
        await ctx.db.insert('userRepos', {
          userId,
          repoId,
          fullName: repo.fullName,
          activityAt,
        })
      else if (link.activityAt !== activityAt)
        await ctx.db.patch('userRepos', link._id, { activityAt })
    }

    // Access revoked on the host: drop links, but only for providers that loaded successfully.
    const links = await ctx.db
      .query('userRepos')
      .withIndex('by_user_activityAt', (q) => q.eq('userId', userId))
      .collect()
    await asyncMap(links, async (link) => {
      const repo = await ctx.db.get('repos', link.repoId)
      const stale =
        !repo ||
        (providers.includes(repo.provider) && !accessible.has(repo._id))
      if (stale) await ctx.db.delete('userRepos', link._id)
    })
  },
})

export const reloadRepos = authedAction({
  args: {},
  handler: async (ctx) => {
    const { providers, repos } = await loadRepositories(ctx)
    await ctx.runMutation(internal.repos.syncUserRepos, {
      userId: ctx.userId,
      providers,
      repos,
    })
  },
})

export const reloadRepo = repoAction({
  args: {},
  handler: async (ctx, { repoId }) => {
    const adapter = gitProviders[ctx.repo.provider]
    const accessToken = await getProviderAccessToken(ctx, ctx.repo.provider)
    const startedAt = Date.now()

    for await (const branches of adapter.listBranches(accessToken, ctx.repo))
      await ctx.runMutation(internal.branches.upsertBranches, {
        repoId,
        branches,
        syncedAt: startedAt,
      })
    // Only reached when every page loaded, so a failed sync never prunes live branches.
    let hasMore = true
    while (hasMore)
      hasMore = await ctx.runMutation(internal.branches.pruneBranches, {
        repoId,
        before: startedAt,
      })

    // Fetched completely before anything is stored, then stored oldest first: the next reload resumes
    // after the newest stored pull request, so an interrupted run must never leave newer ones behind older gaps.
    const since = await ctx.runQuery(internal.pullRequests.latestUpdatedAt, {
      repoId,
    })
    const pullRequestPages: Array<Array<PullRequest>> = []
    for await (const pullRequests of adapter.listPullRequests(
      accessToken,
      ctx.repo,
      since ?? undefined,
    ))
      pullRequestPages.push(pullRequests)
    for (const pullRequests of pullRequestPages.reverse())
      await ctx.runMutation(internal.pullRequests.upsertPullRequests, {
        repoId,
        pullRequests,
      })

    for await (const pipelines of adapter.listPipelines(accessToken, ctx.repo))
      await ctx.runMutation(internal.ciPipelines.upsertPipelines, {
        repoId,
        pipelines,
      })

    const shas: Array<string> = await ctx.runQuery(internal.ciJobs.headShas, {
      repoId,
    })
    for await (const jobs of adapter.listJobs(accessToken, ctx.repo, shas))
      await ctx.runMutation(internal.ciJobs.upsertJobs, {
        repoId,
        jobs,
        syncedAt: startedAt,
      })
    for (const batch of chunk(shas, PRUNE_JOBS_SHA_BATCH_SIZE))
      await ctx.runMutation(internal.ciJobs.pruneJobs, {
        repoId,
        shas: batch,
        before: startedAt,
      })
  },
})

export const getUserRepo = zInternalQuery({
  args: { userId: z.string(), repoId: zid('repos') },
  handler: async (ctx, { userId, repoId }) => {
    const link = await ctx.db
      .query('userRepos')
      .withIndex('by_user_repo', (q) =>
        q.eq('userId', userId).eq('repoId', repoId),
      )
      .unique()
    return link ? ctx.db.get('repos', repoId) : null
  },
})

export const getRepo = authedQuery({
  args: { repoId: zid('repos') },
  handler: (ctx, { repoId }): Promise<Doc<'repos'> | null> =>
    ctx.runQuery(internal.repos.getUserRepo, { userId: ctx.userId, repoId }),
})
