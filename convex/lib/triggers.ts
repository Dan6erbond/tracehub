import { asyncMap } from 'convex-helpers'
import { Triggers } from 'convex-helpers/server/triggers'
import { repoActivityAt } from './repoActivity'
import { tracesByBranch, tracesByPull, tracesByRun } from './traceAggregates'
import type { DataModel } from '../_generated/dataModel'

export const triggers = new Triggers<DataModel>()

// userRepos.fullName/activityAt are denormalized from repos so the per-user list can be searched and paginated by recent activity
triggers.register('repos', async (ctx, change) => {
  if (change.operation !== 'update') return
  const { fullName } = change.newDoc
  const activityAt = repoActivityAt(change.newDoc)
  if (
    change.oldDoc.fullName === fullName &&
    repoActivityAt(change.oldDoc) === activityAt
  )
    return
  const links = await ctx.db
    .query('userRepos')
    .withIndex('by_repo', (q) => q.eq('repoId', change.id))
    .collect()
  await asyncMap(links, (link) =>
    ctx.db.patch('userRepos', link._id, { fullName, activityAt }),
  )
})

triggers.register('traces', tracesByRun.trigger())

// Traces without a branch or pull request are not part of those aggregates, so the counts never mix them in under a placeholder key.
const branchTrigger = tracesByBranch.trigger()
const pullTrigger = tracesByPull.trigger()
triggers.register('traces', async (ctx, change) => {
  const trace = change.newDoc ?? change.oldDoc
  if (trace.branch !== undefined) await branchTrigger(ctx, change)
  if (trace.prNumber !== undefined) await pullTrigger(ctx, change)
})
