import { z } from 'zod'
import { asyncMap } from 'convex-helpers'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import { repoQuery, zInternalMutation, zInternalQuery } from './lib/functions'
import { withTraceCounts } from './runs'
import { jobMatchesRun } from '../src/lib/ci-job-run'
import { ciJobSchema } from '../src/lib/schemas/ci-job'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import type { RunWithCounts } from './runs'

// Jobs are synced for the most recently active heads only, so a repo with thousands of branches keeps a bounded reload.
const MAX_HEADS_PER_SOURCE = 100

export type CiJobWithRuns = Doc<'ciJobs'> & { runs: Array<RunWithCounts> }

const listAtSha = (ctx: QueryCtx, repoId: Doc<'repos'>['_id'], sha: string) =>
  ctx.db
    .query('ciJobs')
    .withIndex('by_repo_sha_externalId', (q) =>
      q.eq('repoId', repoId).eq('sha', sha),
    )
    .collect()

/** Commits worth syncing jobs for: heads of recent branches that have CI, and of recently updated open pull requests. */
export const headShas = zInternalQuery({
  args: { repoId: zid('repos') },
  handler: async (ctx, { repoId }) => {
    const branches = await ctx.db
      .query('branches')
      .withIndex('by_repo_committedAt', (q) => q.eq('repoId', repoId))
      .order('desc')
      .take(MAX_HEADS_PER_SOURCE)
    const pullRequests = await ctx.db
      .query('pullRequests')
      .withIndex('by_repo_state_updatedAt', (q) =>
        q.eq('repoId', repoId).eq('state', 'open'),
      )
      .order('desc')
      .take(MAX_HEADS_PER_SOURCE)
    return [
      ...new Set([
        ...branches
          .filter(({ ciStatus }) => ciStatus !== undefined)
          .map(({ headSha }) => headSha),
        ...pullRequests.map(({ headSha }) => headSha),
      ]),
    ]
  },
})

export const upsertJobs = zInternalMutation({
  args: {
    repoId: zid('repos'),
    jobs: z.array(ciJobSchema),
    syncedAt: z.number(),
  },
  handler: async (ctx, { repoId, jobs, syncedAt }) => {
    await asyncMap(jobs, async (job) => {
      const existing = await ctx.db
        .query('ciJobs')
        .withIndex('by_repo_sha_externalId', (q) =>
          q
            .eq('repoId', repoId)
            .eq('sha', job.sha)
            .eq('externalId', job.externalId),
        )
        .unique()
      const doc = { repoId, ...job, syncedAt }
      if (existing) await ctx.db.replace('ciJobs', existing._id, doc)
      else await ctx.db.insert('ciJobs', doc)
    })
  },
})

/** Deletes jobs of the given commits that the host no longer lists (not touched since `before`). */
export const pruneJobs = zInternalMutation({
  args: { repoId: zid('repos'), shas: z.array(z.string()), before: z.number() },
  handler: async (ctx, { repoId, shas, before }) => {
    const jobsOfShas = await asyncMap(shas, (sha) =>
      listAtSha(ctx, repoId, sha),
    )
    await asyncMap(
      jobsOfShas.flat().filter((job) => job.syncedAt < before),
      (job) => ctx.db.delete('ciJobs', job._id),
    )
  },
})

export const findForRun = zInternalQuery({
  args: { repoId: zid('repos'), runId: zid('runs') },
  handler: async (ctx, { repoId, runId }): Promise<Doc<'ciJobs'> | null> => {
    const run: Doc<'runs'> | null = await ctx.runQuery(
      internal.runs.findInRepo,
      { repoId, runId },
    )
    if (!run) return null
    const jobs = await listAtSha(ctx, repoId, run.sha)
    return jobs.find((job) => jobMatchesRun(job, run)) ?? null
  },
})

/** Jobs of one commit, each with the trace runs uploaded for it. */
export const listJobs = repoQuery({
  args: { sha: z.string() },
  handler: async (ctx, { repoId, sha }): Promise<Array<CiJobWithRuns>> => {
    const jobs = await listAtSha(ctx, repoId, sha)
    const runs: Array<Doc<'runs'>> = await ctx.runQuery(
      internal.runs.listForSha,
      { repoId, sha },
    )
    const withRuns = await asyncMap(jobs, async (job) => ({
      ...job,
      runs: await asyncMap(
        runs.filter((run) => jobMatchesRun(job, run)),
        (run) => withTraceCounts(ctx, run),
      ),
    }))
    return withRuns.sort((a, b) => a.name.localeCompare(b.name))
  },
})
