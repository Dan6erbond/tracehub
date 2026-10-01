import { z } from 'zod'
import { ConvexError } from 'convex/values'
import { asyncMap, pruneNull } from 'convex-helpers'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import { findInRepoQuery } from './lib/findInRepo'
import { repoQuery, zInternalMutation, zInternalQuery } from './lib/functions'
import { insertAndGet, replaceOrInsert, uniqueBy } from './lib/upsert'
import { withRunDetails } from './runs'
import { ciJobSchema } from '../src/lib/schemas/ci-job'
import { httpUrlSchema } from '../src/lib/schemas/url'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import type { RunDetail } from './runs'

// Jobs are synced for the most recently active heads only, so a repo with thousands of branches keeps a bounded reload.
const MAX_HEADS_PER_SOURCE = 100

export type CiJobWithRuns = Doc<'ciJobs'> & { runs: Array<RunDetail> }

/** Jobs of one commit by name. */
export const listAtSha = zInternalQuery({
  args: { repoId: zid('repos'), sha: z.string() },
  handler: (ctx, { repoId, sha }) =>
    ctx.db
      .query('ciJobs')
      .withIndex('by_repo_sha_name', (q) =>
        q.eq('repoId', repoId).eq('sha', sha),
      )
      .collect(),
})

/** Jobs of one pipeline by name. */
export const listForPipeline = zInternalQuery({
  args: { pipelineId: zid('ciPipelines') },
  handler: (ctx, { pipelineId }) =>
    ctx.db
      .query('ciJobs')
      .withIndex('by_pipeline', (q) => q.eq('pipelineId', pipelineId))
      .collect(),
})

export const findInRepo = findInRepoQuery('ciJobs')

export const findByExternalId = zInternalQuery({
  args: { repoId: zid('repos'), sha: z.string(), externalId: z.string() },
  handler: (ctx, { repoId, sha, externalId }) =>
    ctx.db
      .query('ciJobs')
      .withIndex('by_repo_sha_externalId', (q) =>
        q.eq('repoId', repoId).eq('sha', sha).eq('externalId', externalId),
      )
      .unique(),
})

export const findInPipelineByExternalId = zInternalQuery({
  args: { pipelineId: zid('ciPipelines'), externalId: z.string() },
  handler: (ctx, { pipelineId, externalId }) =>
    ctx.db
      .query('ciJobs')
      .withIndex('by_pipeline_externalId', (q) =>
        q.eq('pipelineId', pipelineId).eq('externalId', externalId),
      )
      .first(),
})

/** With `unsyncedOnly`, only jobs an upload created that no sync has replaced yet. */
export const findInPipelineByName = zInternalQuery({
  args: {
    pipelineId: zid('ciPipelines'),
    name: z.string(),
    unsyncedOnly: z.boolean().optional(),
  },
  handler: (ctx, { pipelineId, name, unsyncedOnly }) => {
    const ofName = ctx.db
      .query('ciJobs')
      .withIndex('by_pipeline', (q) =>
        q.eq('pipelineId', pipelineId).eq('name', name),
      )
    return (
      unsyncedOnly
        ? ofName.filter((q) => q.eq(q.field('syncedAt'), undefined))
        : ofName
    ).first()
  },
})

/** Commits worth syncing jobs for: heads of recent branches that have CI, and of recently updated open pull requests. */
export const headShas = zInternalQuery({
  args: { repoId: zid('repos') },
  handler: async (ctx, { repoId }) => {
    const branches = await ctx.db
      .query('branches')
      .withIndex('by_repo_remoteDeletedAt_committedAt', (q) =>
        q.eq('repoId', repoId).eq('remoteDeletedAt', undefined),
      )
      .order('desc')
      .take(MAX_HEADS_PER_SOURCE)
    const pullRequests = await ctx.db
      .query('pullRequests')
      .withIndex('by_repo_closedAt_updatedAt', (q) =>
        q.eq('repoId', repoId).eq('closedAt', undefined),
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

/** The stored job a host-reported job is: the one with its id, else the job an upload created for it in the same pipeline by name. Says which of the two matched. */
export const findForSync = zInternalQuery({
  args: {
    repoId: zid('repos'),
    sha: z.string(),
    externalId: z.string(),
    name: z.string(),
    pipelineId: zid('ciPipelines').optional(),
  },
  handler: async (
    ctx,
    { repoId, sha, externalId, name, pipelineId },
  ): Promise<{
    job: Doc<'ciJobs'>
    matchedBy: 'externalId' | 'name'
  } | null> => {
    const byExternalId: Doc<'ciJobs'> | null = await ctx.runQuery(
      internal.ciJobs.findByExternalId,
      { repoId, sha, externalId },
    )
    if (byExternalId) return { job: byExternalId, matchedBy: 'externalId' }
    if (pipelineId === undefined) return null
    const byName: Doc<'ciJobs'> | null = await ctx.runQuery(
      internal.ciJobs.findInPipelineByName,
      { pipelineId, name, unsyncedOnly: true },
    )
    return byName && { job: byName, matchedBy: 'name' }
  },
})

export const upsertJobs = zInternalMutation({
  args: {
    repoId: zid('repos'),
    jobs: z.array(ciJobSchema),
    syncedAt: z.number(),
  },
  handler: async (ctx, { repoId, jobs, syncedAt }) => {
    const pipelineIds = new Map(
      await asyncMap(
        new Set(jobs.flatMap(({ pipeline }) => pipeline ?? [])),
        async (externalId) => {
          const found: Doc<'ciPipelines'> | null = await ctx.runQuery(
            internal.ciPipelines.findByExternalId,
            { repoId, externalId },
          )
          return [externalId, found?._id] as const
        },
      ),
    )
    const batch = await asyncMap(
      uniqueBy(jobs, ({ sha, externalId }) => `${sha}\0${externalId}`),
      async ({ pipeline, ...job }) => {
        const pipelineId =
          pipeline === undefined ? undefined : pipelineIds.get(pipeline)
        const found: {
          job: Doc<'ciJobs'>
          matchedBy: 'externalId' | 'name'
        } | null = await ctx.runQuery(internal.ciJobs.findForSync, {
          repoId,
          sha: job.sha,
          externalId: job.externalId,
          name: job.name,
          pipelineId,
        })
        return { job, pipelineId, found }
      },
    )
    // Jobs of one pipeline can share a name, and an unsynced job is only replaced by the first of them. Matches by id come first: the job an id names may be the one a name match would take.
    const claimed = new Set<Id<'ciJobs'>>(
      batch.flatMap(({ found }) =>
        found?.matchedBy === 'externalId' ? [found.job._id] : [],
      ),
    )
    await asyncMap(batch, ({ job, pipelineId, found }) => {
      const claimable =
        found?.matchedBy === 'name' && !claimed.has(found.job._id)
      if (claimable) claimed.add(found.job._id)
      const existing =
        found?.matchedBy === 'externalId' || claimable ? found.job : null
      return replaceOrInsert(ctx, 'ciJobs', existing, {
        repoId,
        ...job,
        pipelineId,
        syncedAt,
      })
    })
  },
})

/** The job an upload runs in, created when the host has not reported it yet; the next sync replaces it, keeping the id. `sha` is the commit of its pipeline, if it has one. */
export const ensureJob = zInternalMutation({
  args: {
    repoId: zid('repos'),
    sha: z.string(),
    pipelineId: zid('ciPipelines').optional(),
    externalId: z.string().optional(),
    name: z.string().optional(),
    url: httpUrlSchema.optional(),
  },
  handler: async (
    ctx,
    { repoId, sha, pipelineId, externalId, name, url },
  ): Promise<Doc<'ciJobs'>> => {
    const key = externalId ?? name
    if (key === undefined) throw new ConvexError('A job needs an id or a name')
    const existing: Doc<'ciJobs'> | null =
      pipelineId === undefined
        ? await ctx.runQuery(internal.ciJobs.findByExternalId, {
            repoId,
            sha,
            externalId: key,
          })
        : externalId === undefined
          ? await ctx.runQuery(internal.ciJobs.findInPipelineByName, {
              pipelineId,
              name: key,
            })
          : await ctx.runQuery(internal.ciJobs.findInPipelineByExternalId, {
              pipelineId,
              externalId,
            })
    return (
      existing ??
      insertAndGet(ctx, 'ciJobs', {
        repoId,
        sha,
        externalId: key,
        name: name ?? key,
        pipelineId,
        url,
      })
    )
  },
})

/** Deletes jobs of the given commits that the host no longer lists (not touched since `before`), unless runs reference them. */
export const pruneJobs = zInternalMutation({
  args: { repoId: zid('repos'), shas: z.array(z.string()), before: z.number() },
  handler: async (ctx, { repoId, shas, before }) => {
    const jobsOfShas = await asyncMap(
      shas,
      (sha): Promise<Array<Doc<'ciJobs'>>> =>
        ctx.runQuery(internal.ciJobs.listAtSha, { repoId, sha }),
    )
    const stale = jobsOfShas
      .flat()
      .filter((job) => job.syncedAt !== undefined && job.syncedAt < before)
    await asyncMap(stale, async (job) => {
      const referenced: boolean = await ctx.runQuery(
        internal.runs.existsForJob,
        { jobId: job._id },
      )
      if (!referenced) await ctx.db.delete('ciJobs', job._id)
    })
  },
})

/** Attaches to each job the runs that reference it. */
export const attachRuns = (
  jobs: Array<Doc<'ciJobs'>>,
  runs: Array<RunDetail>,
): Array<CiJobWithRuns> =>
  jobs.map((job) => ({
    ...job,
    runs: runs.filter((run) => run.jobId === job._id),
  }))

const withRuns = (
  ctx: QueryCtx,
  jobs: Array<Doc<'ciJobs'>>,
  pipelines: Array<Doc<'ciPipelines'>>,
): Promise<Array<CiJobWithRuns>> =>
  asyncMap(jobs, async (job) => {
    const runs: Array<Doc<'runs'>> = await ctx.runQuery(
      internal.runs.listForJob,
      { jobId: job._id },
    )
    return {
      ...job,
      runs: await asyncMap(runs, (run) =>
        withRunDetails(ctx, run, { jobs: [job], pipelines }),
      ),
    }
  })

const findPipelines = async (
  ctx: QueryCtx,
  repoId: Id<'repos'>,
  jobs: Array<Doc<'ciJobs'>>,
): Promise<Array<Doc<'ciPipelines'>>> =>
  pruneNull(
    await asyncMap(
      new Set(jobs.flatMap(({ pipelineId }) => pipelineId ?? [])),
      (id): Promise<Doc<'ciPipelines'> | null> =>
        ctx.runQuery(internal.ciPipelines.findInRepo, { repoId, id }),
    ),
  )

/** Jobs of one commit, each with the trace runs uploaded for it. */
export const listJobs = repoQuery({
  args: { sha: z.string() },
  handler: async (ctx, { repoId, sha }): Promise<Array<CiJobWithRuns>> => {
    const jobs: Array<Doc<'ciJobs'>> = await ctx.runQuery(
      internal.ciJobs.listAtSha,
      { repoId, sha },
    )
    return withRuns(ctx, jobs, await findPipelines(ctx, repoId, jobs))
  },
})

export const getJob = repoQuery({
  args: { jobId: zid('ciJobs') },
  handler: async (
    ctx,
    { repoId, jobId },
  ): Promise<{
    job: CiJobWithRuns
    pipeline: Doc<'ciPipelines'> | null
  } | null> => {
    const job: Doc<'ciJobs'> | null = await ctx.runQuery(
      internal.ciJobs.findInRepo,
      { repoId, id: jobId },
    )
    if (!job) return null
    const [pipeline = null] = await findPipelines(ctx, repoId, [job])
    const [withRunsOfJob] = await withRuns(
      ctx,
      [job],
      pipeline ? [pipeline] : [],
    )
    return { job: withRunsOfJob, pipeline }
  },
})
