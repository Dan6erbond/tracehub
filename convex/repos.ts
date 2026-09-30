import { z } from 'zod'
import { asyncMap } from 'convex-helpers'
import { stream } from 'convex-helpers/server/stream'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import schema from './schema'
import { authedAction, authedQuery, zInternalMutation } from './lib/functions'
import { loadRepositories } from './lib/gitProviders/loadRepositories'
import { paginationOptsSchema } from '../src/lib/schemas/pagination'
import { gitProviderSchema, repoSchema } from '../src/lib/schemas/repo'

export const listRepos = authedQuery({
  args: { paginationOpts: paginationOptsSchema },
  handler: async (ctx, { paginationOpts }) => {
    return stream(ctx.db, schema)
      .query('userRepos')
      .withIndex('by_user_fullName', (q) => q.eq('userId', ctx.userId))
      .map((link) => ctx.db.get('repos', link.repoId))
      .paginate(paginationOpts)
  },
})

export const upsertRepo = zInternalMutation({
  args: { repo: repoSchema },
  handler: async (ctx, { repo }) => {
    const existing = await ctx.db
      .query('repos')
      .withIndex('by_provider_externalId', (q) =>
        q.eq('provider', repo.provider).eq('externalId', repo.externalId),
      )
      .unique()
    if (!existing) return ctx.db.insert('repos', repo)
    // replace (not patch) so fields the host dropped, e.g. a description, are cleared
    await ctx.db.replace('repos', existing._id, repo)
    return existing._id
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
        })
    }

    // Access revoked on the host: drop links, but only for providers that loaded successfully.
    const links = await ctx.db
      .query('userRepos')
      .withIndex('by_user_fullName', (q) => q.eq('userId', userId))
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

export const getRepo = authedQuery({
  args: { repoId: zid('repos') },
  handler: async (ctx, { repoId }) => {
    const link = await ctx.db
      .query('userRepos')
      .withIndex('by_user_repo', (q) =>
        q.eq('userId', ctx.userId).eq('repoId', repoId),
      )
      .unique()
    return link ? ctx.db.get('repos', repoId) : null
  },
})
