import { z } from 'zod'
import { ConvexError } from 'convex/values'
import { asyncMap } from 'convex-helpers'
import { stream } from 'convex-helpers/server/stream'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import schema from './schema'
import { findInRepoQuery } from './lib/findInRepo'
import { repoQuery, zInternalMutation, zInternalQuery } from './lib/functions'
import { insertAndGet, replaceOrInsert, uniqueBy } from './lib/upsert'
import { ciJobSchema } from '../src/lib/schemas/ci-job'
import { httpUrlSchema } from '../src/lib/schemas/url'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

// Jobs are synced for the most recently active heads only, so a repo with thousands of branches keeps a bounded reload.
const MAX_HEADS_PER_SOURCE = 100

// Branches without CI are skipped while looking for heads; the cap keeps a repo with few CI branches from scanning all of them.
const MAX_BRANCHES_SCANNED_FOR_HEADS = 1000

// The host bounds the jobs of a commit or pipeline; listings returned to the frontend still stop here.
const MAX_JOBS_PER_LIST = 200

export type CiJobWithRunCount = Doc<'ciJobs'> & { runCount: number }
export type CiJobListing = {
  jobs: Array<CiJobWithRunCount>
  // The host reported more jobs than the list holds.
  truncated: boolean
}

/** Jobs of one commit by name; all of them unless `limit` is given. */
export const listAtSha = zInternalQuery({
  args: {
    repoId: zid('repos'),
    sha: z.string(),
    limit: z.number().optional(),
    outsidePipelines: z.boolean().optional(),
  },
  handler: (ctx, { repoId, sha, limit, outsidePipelines }) => {
    const atSha = ctx.db
      .query('ciJobs')
      .withIndex('by_repo_sha_name', (q) =>
        q.eq('repoId', repoId).eq('sha', sha),
      )
    const jobs = outsidePipelines
      ? atSha.filter((q) => q.eq(q.field('pipelineId'), undefined))
      : atSha
    return limit === undefined ? jobs.collect() : jobs.take(limit)
  },
})

/** Jobs of one pipeline by name, one more than `MAX_JOBS_PER_LIST` so callers can tell the list was cut. */
export const listForPipeline = zInternalQuery({
  args: { pipelineId: zid('ciPipelines') },
  handler: (ctx, { pipelineId }) =>
    ctx.db
      .query('ciJobs')
      .withIndex('by_pipeline', (q) => q.eq('pipelineId', pipelineId))
      .take(MAX_JOBS_PER_LIST + 1),
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
      .first(),
})

/** Jobs of a commit outside any pipeline (commit statuses, and uploads that name a job only). With `stubsOnly`, only those an upload named by name that no sync has replaced yet. */
export const findAtShaByName = zInternalQuery({
  args: {
    repoId: zid('repos'),
    sha: z.string(),
    name: z.string(),
    stubsOnly: z.boolean().optional(),
  },
  handler: (ctx, { repoId, sha, name, stubsOnly }) =>
    ctx.db
      .query('ciJobs')
      .withIndex('by_repo_sha_name', (q) =>
        q.eq('repoId', repoId).eq('sha', sha).eq('name', name),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('pipelineId'), undefined),
          ...(stubsOnly
            ? [
                q.eq(q.field('syncedAt'), undefined),
                q.eq(q.field('externalId'), undefined),
              ]
            : []),
        ),
      )
      .first(),
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

/** With `stubsOnly`, only jobs an upload named by name that no sync has replaced yet. */
export const findInPipelineByName = zInternalQuery({
  args: {
    pipelineId: zid('ciPipelines'),
    name: z.string(),
    stubsOnly: z.boolean().optional(),
  },
  handler: (ctx, { pipelineId, name, stubsOnly }) => {
    const ofName = ctx.db
      .query('ciJobs')
      .withIndex('by_pipeline', (q) =>
        q.eq('pipelineId', pipelineId).eq('name', name),
      )
    return (
      stubsOnly
        ? ofName.filter((q) =>
            q.and(
              q.eq(q.field('syncedAt'), undefined),
              q.eq(q.field('externalId'), undefined),
            ),
          )
        : ofName
    ).first()
  },
})

/** Commits worth syncing jobs for: heads of recent branches that have CI, and of recently updated open pull requests. */
export const headShas = zInternalQuery({
  args: { repoId: zid('repos') },
  handler: async (ctx, { repoId }) => {
    const { page: branches } = await stream(ctx.db, schema)
      .query('branches')
      .withIndex('by_repo_remoteDeletedAt_committedAt', (q) =>
        q.eq('repoId', repoId).eq('remoteDeletedAt', undefined),
      )
      .order('desc')
      .filterWith(({ ciStatus }) => Promise.resolve(ciStatus !== undefined))
      .paginate({
        numItems: MAX_HEADS_PER_SOURCE,
        cursor: null,
        maximumRowsRead: MAX_BRANCHES_SCANNED_FOR_HEADS,
      })
    const pullRequests = await ctx.db
      .query('pullRequests')
      .withIndex('by_repo_closedAt_updatedAt', (q) =>
        q.eq('repoId', repoId).eq('closedAt', undefined),
      )
      .order('desc')
      .take(MAX_HEADS_PER_SOURCE)
    return [
      ...new Set([
        ...branches.map(({ headSha }) => headSha),
        ...pullRequests.map(({ headSha }) => headSha),
      ]),
    ]
  },
})

/** The stored job a host-reported job is: the one with its id, else the job an upload named by name only for it, in the same pipeline or, outside pipelines, at the same commit. Says which of the two matched. */
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
    const byName: Doc<'ciJobs'> | null =
      pipelineId === undefined
        ? await ctx.runQuery(internal.ciJobs.findAtShaByName, {
            repoId,
            sha,
            name,
            stubsOnly: true,
          })
        : await ctx.runQuery(internal.ciJobs.findInPipelineByName, {
            pipelineId,
            name,
            stubsOnly: true,
          })
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
    await asyncMap(batch, async ({ job, pipelineId, found }) => {
      const claimable =
        found?.matchedBy === 'name' && !claimed.has(found.job._id)
      if (claimable) claimed.add(found.job._id)
      const existing =
        found?.matchedBy === 'externalId' || claimable ? found.job : null
      const stored = await replaceOrInsert(ctx, 'ciJobs', existing, {
        repoId,
        ...job,
        // A pipeline an upload attached stays when the host reports the job without one.
        pipelineId: pipelineId ?? existing?.pipelineId,
        syncedAt,
      })
      if (
        existing &&
        stored.pipelineId !== undefined &&
        stored.pipelineId !== existing.pipelineId
      )
        await ctx.runMutation(internal.runs.attachJobRuns, {
          jobId: stored._id,
          pipelineId: stored.pipelineId,
        })
    })
  },
})

/** The job an upload names by id: one of its pipeline, else a job of the commit outside any pipeline (synced before its pipeline was), which the upload then attaches to the pipeline. */
const findJobById = async (
  ctx: MutationCtx,
  {
    repoId,
    sha,
    pipelineId,
    externalId,
  }: {
    repoId: Id<'repos'>
    sha: string
    pipelineId: Id<'ciPipelines'> | undefined
    externalId: string
  },
): Promise<Doc<'ciJobs'> | null> => {
  const inPipeline: Doc<'ciJobs'> | null =
    pipelineId === undefined
      ? null
      : await ctx.runQuery(internal.ciJobs.findInPipelineByExternalId, {
          pipelineId,
          externalId,
        })
  if (inPipeline) return inPipeline
  const atSha: Doc<'ciJobs'> | null = await ctx.runQuery(
    internal.ciJobs.findByExternalId,
    { repoId, sha, externalId },
  )
  return atSha &&
    (pipelineId === undefined ||
      atSha.pipelineId === undefined ||
      atSha.pipelineId === pipelineId)
    ? atSha
    : null
}

/** The job an upload names by name only: one of its pipeline, else a job of the commit outside any pipeline, which the upload then attaches to the pipeline. */
const findJobByName = async (
  ctx: MutationCtx,
  {
    repoId,
    sha,
    pipelineId,
    name,
  }: {
    repoId: Id<'repos'>
    sha: string
    pipelineId: Id<'ciPipelines'> | undefined
    name: string
  },
): Promise<Doc<'ciJobs'> | null> => {
  const inPipeline: Doc<'ciJobs'> | null =
    pipelineId === undefined
      ? null
      : await ctx.runQuery(internal.ciJobs.findInPipelineByName, {
          pipelineId,
          name,
        })
  return (
    inPipeline ??
    ctx.runQuery(internal.ciJobs.findAtShaByName, { repoId, sha, name })
  )
}

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
    const jobName = name ?? externalId
    if (jobName === undefined)
      throw new ConvexError('A job needs an id or a name')
    const existing: Doc<'ciJobs'> | null =
      externalId === undefined
        ? await findJobByName(ctx, { repoId, sha, pipelineId, name: jobName })
        : await findJobById(ctx, { repoId, sha, pipelineId, externalId })
    if (!existing)
      return insertAndGet(ctx, 'ciJobs', {
        repoId,
        sha,
        externalId,
        name: jobName,
        pipelineId,
        url,
      })
    if (pipelineId === undefined || existing.pipelineId !== undefined)
      return existing
    await ctx.db.patch('ciJobs', existing._id, { pipelineId })
    await ctx.runMutation(internal.runs.attachJobRuns, {
      jobId: existing._id,
      pipelineId,
    })
    return { ...existing, pipelineId }
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

const withRunCounts = async (
  ctx: QueryCtx,
  jobs: Array<Doc<'ciJobs'>>,
): Promise<CiJobListing> => ({
  jobs: await asyncMap(jobs.slice(0, MAX_JOBS_PER_LIST), async (job) => ({
    ...job,
    runCount: await ctx.runQuery(internal.runs.countForJob, { jobId: job._id }),
  })),
  truncated: jobs.length > MAX_JOBS_PER_LIST,
})

/** Jobs of one commit that belong to no pipeline (commit statuses, checks of other CI apps), each with the number of trace runs uploaded for it. */
export const listOtherChecks = repoQuery({
  args: { sha: z.string() },
  handler: async (ctx, { repoId, sha }): Promise<CiJobListing> => {
    const jobs: Array<Doc<'ciJobs'>> = await ctx.runQuery(
      internal.ciJobs.listAtSha,
      { repoId, sha, limit: MAX_JOBS_PER_LIST + 1, outsidePipelines: true },
    )
    return withRunCounts(ctx, jobs)
  },
})

/** Jobs of one pipeline, each with the number of trace runs uploaded for it. */
export const listPipelineJobs = repoQuery({
  args: { pipelineId: zid('ciPipelines') },
  handler: async (ctx, { repoId, pipelineId }): Promise<CiJobListing> => {
    const pipeline: Doc<'ciPipelines'> | null = await ctx.runQuery(
      internal.ciPipelines.findInRepo,
      { repoId, id: pipelineId },
    )
    if (!pipeline) return { jobs: [], truncated: false }
    const jobs: Array<Doc<'ciJobs'>> = await ctx.runQuery(
      internal.ciJobs.listForPipeline,
      { pipelineId },
    )
    return withRunCounts(ctx, jobs)
  },
})

export const getJob = repoQuery({
  args: { jobId: zid('ciJobs') },
  handler: async (
    ctx,
    { repoId, jobId },
  ): Promise<{
    job: CiJobWithRunCount
    pipeline: Doc<'ciPipelines'> | null
  } | null> => {
    const job: Doc<'ciJobs'> | null = await ctx.runQuery(
      internal.ciJobs.findInRepo,
      { repoId, id: jobId },
    )
    if (!job) return null
    const pipeline: Doc<'ciPipelines'> | null =
      job.pipelineId === undefined
        ? null
        : await ctx.runQuery(internal.ciPipelines.findInRepo, {
            repoId,
            id: job.pipelineId,
          })
    const runCount: number = await ctx.runQuery(internal.runs.countForJob, {
      jobId,
    })
    return { job: { ...job, runCount }, pipeline }
  },
})
