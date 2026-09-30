import { asyncMap } from 'convex-helpers'
import { Triggers } from 'convex-helpers/server/triggers'
import type { DataModel } from '../_generated/dataModel'

export const triggers = new Triggers<DataModel>()

// userRepos.fullName is denormalized from repos so the per-user list can be paginated in name order
triggers.register('repos', async (ctx, change) => {
  if (change.operation !== 'update') return
  const { fullName } = change.newDoc
  if (change.oldDoc.fullName === fullName) return
  const links = await ctx.db
    .query('userRepos')
    .withIndex('by_repo', (q) => q.eq('repoId', change.id))
    .collect()
  await asyncMap(links, (link) =>
    ctx.db.patch('userRepos', link._id, { fullName }),
  )
})
