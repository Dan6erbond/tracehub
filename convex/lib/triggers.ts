import { asyncMap } from 'convex-helpers'
import { Triggers } from 'convex-helpers/server/triggers'
import { repoActivityAt } from './repoActivity'
import { runsByJob } from './runAggregates'
import {
  tracesByBranch,
  tracesByPipeline,
  tracesByPull,
  tracesByRun,
} from './traceAggregates'
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

// A run that gets a pipeline (see runs.attachJobRuns) moves its traces between pipeline namespaces on update; traces without one are not aggregated.
triggers.register('traces', async (ctx, { oldDoc, newDoc }) => {
  if (oldDoc && newDoc && oldDoc.pipelineId === newDoc.pipelineId) return
  if (oldDoc?.pipelineId !== undefined)
    await tracesByPipeline.deleteIfExists(ctx, oldDoc)
  if (newDoc?.pipelineId !== undefined)
    await tracesByPipeline.insertIfDoesNotExist(ctx, newDoc)
})

// A run's job is fixed when it is created (only its pipeline changes later), so only inserts and deletes touch this aggregate.
const jobTrigger = runsByJob.trigger()
triggers.register('runs', async (ctx, change) => {
  if (change.operation === 'update') return
  const run = change.newDoc ?? change.oldDoc
  if (run.jobId !== undefined) await jobTrigger(ctx, change)
})

// Traces without a branch or pull request are not part of those aggregates, so the counts never mix them in under a placeholder key.
// Idempotent because a run adopts the branch and pull request of its pipeline after the fact, which moves its traces into these aggregates on update.
const branchTrigger = tracesByBranch.idempotentTrigger()
const pullTrigger = tracesByPull.idempotentTrigger()
triggers.register('traces', async (ctx, change) => {
  const trace = change.newDoc ?? change.oldDoc
  if (trace.branch !== undefined) await branchTrigger(ctx, change)
  if (trace.prNumber !== undefined) await pullTrigger(ctx, change)
})
