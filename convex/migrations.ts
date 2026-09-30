import { Migrations } from '@convex-dev/migrations'
import { components, internal } from './_generated/api'
import schema from './schema'

export const migrations = new Migrations(components.migrations, { schema })
export const run = migrations.runner()

export const backfillUserRepoFullName = migrations.define({
  table: 'userRepos',
  customRange: (query) =>
    query.withIndex('by_fullName', (q) => q.eq('fullName', undefined)),
  migrateOne: async (ctx, link) => {
    const repo = await ctx.db.get('repos', link.repoId)
    if (!repo) return ctx.db.delete('userRepos', link._id)
    return { fullName: repo.fullName }
  },
})

export const runAll = migrations.runner([
  internal.migrations.backfillUserRepoFullName,
])
