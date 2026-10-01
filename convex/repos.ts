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
import { createAdapter } from './lib/gitProviders'
import { getProviderAccessToken } from './lib/gitProviders/getAccessToken'
import { loadRepositories } from './lib/gitProviders/loadRepositories'
import {
  loadProviderConfig,
  providerLoader,
} from './lib/gitProviders/providerConfig'
import { withRepoLinks } from './lib/hostLinks'
import { repoActivityAt } from './lib/repoActivity'
import { replaceOrInsert, uniqueBy } from './lib/upsert'
import { withReloadLock } from './lib/withReloadLock'
import { repoViewSchema } from '../src/lib/schemas/host-links'
import { paginationOptsSchema } from '../src/lib/schemas/pagination'
import { repoSchema } from '../src/lib/schemas/repo'
import type { PullRequest } from '../src/lib/schemas/pull-request'
import type { Doc } from './_generated/dataModel'

const PRUNE_JOBS_SHA_BATCH_SIZE = 25

// Each repo of a batch is upserted and linked in one mutation, so the batch size bounds its reads and writes.
const SYNC_REPOS_BATCH_SIZE = 50
const PRUNE_LINKS_BATCH_SIZE = 200

export const listRepos = authedQuery({
  args: { search: z.string().optional(), paginationOpts: paginationOptsSchema },
  handler: async (ctx, { search, paginationOpts }) => {
    const term = search?.trim()
    const loadProvider = providerLoader(ctx)
    const getRepoOfLink = async (link: Doc<'userRepos'>) => {
      const repo = await ctx.db.get('repos', link.repoId)
      const provider = repo && (await loadProvider(repo.providerId))
      return repo && provider?.enabled ? withRepoLinks(repo, provider) : null
    }
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
  args: { providerId: zid('gitProviders'), externalId: z.string() },
  handler: (ctx, { providerId, externalId }) =>
    ctx.db
      .query('repos')
      .withIndex('by_provider_externalId', (q) =>
        q.eq('providerId', providerId).eq('externalId', externalId),
      )
      .unique(),
})

export const existsForProvider = zInternalQuery({
  args: { providerId: zid('gitProviders') },
  handler: async (ctx, { providerId }) =>
    (await ctx.db
      .query('repos')
      .withIndex('by_provider_externalId', (q) =>
        q.eq('providerId', providerId),
      )
      .first()) !== null,
})

export const findUserRepoLink = zInternalQuery({
  args: { userId: z.string(), repoId: zid('repos') },
  handler: (ctx, { userId, repoId }) =>
    ctx.db
      .query('userRepos')
      .withIndex('by_user_repo', (q) =>
        q.eq('userId', userId).eq('repoId', repoId),
      )
      .unique(),
})

export const syncUserRepos = zInternalMutation({
  args: {
    userId: z.string(),
    repos: z.array(repoSchema),
    syncedAt: z.number(),
  },
  handler: async (ctx, { userId, repos, syncedAt }) => {
    await asyncMap(
      uniqueBy(
        repos,
        ({ providerId, externalId }) => `${providerId}\0${externalId}`,
      ),
      async (repo) => {
        const existing: Doc<'repos'> | null = await ctx.runQuery(
          internal.repos.findByExternalId,
          { providerId: repo.providerId, externalId: repo.externalId },
        )
        const stored = await replaceOrInsert(ctx, 'repos', existing, repo)
        const link: Doc<'userRepos'> | null = await ctx.runQuery(
          internal.repos.findUserRepoLink,
          { userId, repoId: stored._id },
        )
        // An existing link already follows the repo's name and activity through the repos trigger.
        // Overlapping reloads must not move `syncedAt` back, or the later one's prune would drop live links.
        if (link)
          await ctx.db.patch('userRepos', link._id, {
            syncedAt: Math.max(link.syncedAt, syncedAt),
          })
        else
          await ctx.db.insert('userRepos', {
            userId,
            repoId: stored._id,
            fullName: stored.fullName,
            activityAt: repoActivityAt(stored),
            syncedAt,
          })
      },
    )
  },
})

/**
 * Access revoked on the host: drops the links a reload did not list (not touched since `before`),
 * but only for providers that loaded successfully. Returns the cursor to continue with, or null when done.
 */
export const pruneUserRepos = zInternalMutation({
  args: {
    userId: z.string(),
    providers: z.array(zid('gitProviders')),
    before: z.number(),
    cursor: z.string().nullable(),
  },
  handler: async (
    ctx,
    { userId, providers, before, cursor },
  ): Promise<string | null> => {
    const { page, isDone, continueCursor } = await ctx.db
      .query('userRepos')
      .withIndex('by_user_syncedAt', (q) =>
        q.eq('userId', userId).lt('syncedAt', before),
      )
      .paginate({ numItems: PRUNE_LINKS_BATCH_SIZE, cursor })
    await asyncMap(page, async (link) => {
      const repo = await ctx.db.get('repos', link.repoId)
      if (!repo || providers.includes(repo.providerId))
        await ctx.db.delete('userRepos', link._id)
    })
    return isDone ? null : continueCursor
  },
})

export const reloadRepos = authedAction({
  args: {},
  handler: (ctx) =>
    withReloadLock(ctx, { kind: 'user', userId: ctx.userId }, async () => {
      const { providers, repos } = await loadRepositories(ctx)
      const startedAt = Date.now()
      for (const batch of chunk(repos, SYNC_REPOS_BATCH_SIZE))
        await ctx.runMutation(internal.repos.syncUserRepos, {
          userId: ctx.userId,
          repos: batch,
          syncedAt: startedAt,
        })
      let cursor: string | null = null
      do
        cursor = await ctx.runMutation(internal.repos.pruneUserRepos, {
          userId: ctx.userId,
          providers,
          before: startedAt,
          cursor,
        })
      while (cursor !== null)
    }),
})

export const reloadRepo = repoAction({
  args: {},
  handler: (ctx, { repoId }) =>
    withReloadLock(ctx, { kind: 'repo', repoId }, async () => {
      const adapter = createAdapter(ctx.provider)
      const accessToken = await getProviderAccessToken(ctx, ctx.provider)
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

      for await (const pipelines of adapter.listPipelines(
        accessToken,
        ctx.repo,
      ))
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
    }),
})

export const getUserRepo = zInternalQuery({
  args: { userId: z.string(), repoId: zid('repos') },
  handler: async (ctx, { userId, repoId }): Promise<Doc<'repos'> | null> => {
    const link: Doc<'userRepos'> | null = await ctx.runQuery(
      internal.repos.findUserRepoLink,
      { userId, repoId },
    )
    return link ? ctx.db.get('repos', repoId) : null
  },
})

export const getRepo = authedQuery({
  args: { repoId: zid('repos') },
  returns: repoViewSchema.nullable(),
  handler: async (
    ctx,
    { repoId },
  ): Promise<z.infer<typeof repoViewSchema> | null> => {
    const repo: Doc<'repos'> | null = await ctx.runQuery(
      internal.repos.getUserRepo,
      { userId: ctx.userId, repoId },
    )
    const provider = repo && (await loadProviderConfig(ctx, repo.providerId))
    return repo && provider?.enabled ? withRepoLinks(repo, provider) : null
  },
})
