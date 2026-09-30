import { z } from 'zod'
import { ConvexError } from 'convex/values'
import { asyncMap } from 'convex-helpers'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import { repoQuery, zInternalMutation, zInternalQuery } from './lib/functions'
import { replaceOrInsert } from './lib/upsert'
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

export const findInRepo = zInternalQuery({
  args: { repoId: zid('repos'), jobId: zid('ciJobs') },
  handler: async (ctx, { repoId, jobId }) => {
    const job = await ctx.db.get('ciJobs', jobId)
    return job?.repoId === repoId ? job : null
  },
})

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
      .withIndex('by_repo_closedAt_updatedAt', (q) =>
        q.eq('repoId', repoId).eq('closedAt', undefined),
      )
      .order('desc')
      .take(MAX_HEADS_PER_SOURCE)
    return [
      ...new Set([
        ...branches
          .filter(
            ({ ciStatus, remoteDeletedAt }) =>
              ciStatus !== undefined && remoteDeletedAt === undefined,
          )
          .map(({ headSha }) => headSha),
        ...pullRequests.map(({ headSha }) => headSha),
      ]),
    ]
  },
})

/** The stored job a host-reported job is: the one with its id, else the job an upload created for it in the same pipeline by name. */
export const findForSync = zInternalQuery({
  args: {
    repoId: zid('repos'),
    sha: z.string(),
    externalId: z.string(),
    name: z.string(),
    pipelineId: zid('ciPipelines').optional(),
  },
  handler: async (ctx, { repoId, sha, externalId, name, pipelineId }) => {
    const byExternalId = await ctx.db
      .query('ciJobs')
      .withIndex('by_repo_sha_externalId', (q) =>
        q.eq('repoId', repoId).eq('sha', sha).eq('externalId', externalId),
      )
      .unique()
    if (byExternalId || pipelineId === undefined) return byExternalId
    const ofPipeline = await ctx.db
      .query('ciJobs')
      .withIndex('by_pipeline', (q) => q.eq('pipelineId', pipelineId))
      .collect()
    return (
      ofPipeline.find(
        (job) => job.syncedAt === undefined && job.name === name,
      ) ?? null
    )
  },
})

export const upsertJobs = zInternalMutation({
  args: {
    repoId: zid('repos'),
    jobs: z.array(ciJobSchema),
    syncedAt: z.number(),
  },
  handler: async (ctx, { repoId, jobs, syncedAt }) => {
    const pipelineIds = new Map<string, Id<'ciPipelines'> | undefined>()
    for (const { pipeline } of jobs) {
      if (pipeline === undefined || pipelineIds.has(pipeline)) continue
      const found: Doc<'ciPipelines'> | null = await ctx.runQuery(
        internal.ciPipelines.findByExternalId,
        { repoId, externalId: pipeline },
      )
      pipelineIds.set(pipeline, found?._id)
    }
    for (const { pipeline, ...job } of jobs) {
      const pipelineId =
        pipeline === undefined ? undefined : pipelineIds.get(pipeline)
      const existing: Doc<'ciJobs'> | null = await ctx.runQuery(
        internal.ciJobs.findForSync,
        {
          repoId,
          sha: job.sha,
          externalId: job.externalId,
          name: job.name,
          pipelineId,
        },
      )
      await replaceOrInsert(ctx, 'ciJobs', existing, {
        repoId,
        ...job,
        pipelineId,
        syncedAt,
      })
    }
  },
})

/** The job an upload runs in, created when the host has not reported it yet; the next sync replaces it, keeping the id. */
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
    // Uploads may carry another commit than the pipeline (pull request workflows run on a merge commit), so jobs of a pipeline are found through it.
    const ofPipeline: Array<Doc<'ciJobs'>> =
      pipelineId === undefined
        ? []
        : await ctx.runQuery(internal.ciJobs.listForPipeline, { pipelineId })
    const existing: Doc<'ciJobs'> | null =
      pipelineId === undefined
        ? await ctx.runQuery(internal.ciJobs.findForSync, {
            repoId,
            sha,
            externalId: key,
            name: key,
          })
        : (ofPipeline.find((job) =>
            externalId === undefined
              ? job.name === name
              : job.externalId === externalId,
          ) ?? null)
    if (existing) return existing
    const pipeline: Doc<'ciPipelines'> | null =
      pipelineId === undefined
        ? null
        : await ctx.runQuery(internal.ciPipelines.findInRepo, {
            repoId,
            pipelineId,
          })
    const jobId = await ctx.db.insert('ciJobs', {
      repoId,
      sha: pipeline?.sha ?? sha,
      externalId: key,
      name: name ?? key,
      pipelineId,
      url,
    })
    const job = await ctx.db.get('ciJobs', jobId)
    if (!job) throw new ConvexError('Job not found')
    return job
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
      const runs: Array<Doc<'runs'>> = await ctx.runQuery(
        internal.runs.listForJob,
        { jobId: job._id },
      )
      if (runs.length === 0) await ctx.db.delete('ciJobs', job._id)
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
): Promise<Array<CiJobWithRuns>> =>
  asyncMap(jobs, async (job) => {
    const runs: Array<Doc<'runs'>> = await ctx.runQuery(
      internal.runs.listForJob,
      { jobId: job._id },
    )
    return {
      ...job,
      runs: await asyncMap(runs, (run) => withRunDetails(ctx, run)),
    }
  })

/** Jobs of one commit, each with the trace runs uploaded for it. */
export const listJobs = repoQuery({
  args: { sha: z.string() },
  handler: async (ctx, { repoId, sha }): Promise<Array<CiJobWithRuns>> => {
    const jobs: Array<Doc<'ciJobs'>> = await ctx.runQuery(
      internal.ciJobs.listAtSha,
      { repoId, sha },
    )
    return withRuns(ctx, jobs)
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
      { repoId, jobId },
    )
    if (!job) return null
    const [withRunsOfJob] = await withRuns(ctx, [job])
    const pipeline: Doc<'ciPipelines'> | null =
      job.pipelineId === undefined
        ? null
        : await ctx.runQuery(internal.ciPipelines.findInRepo, {
            repoId,
            pipelineId: job.pipelineId,
          })
    return { job: withRunsOfJob, pipeline }
  },
})
