import { z } from 'zod'
import { ConvexError } from 'convex/values'
import type { PaginationResult } from 'convex/server'
import { asyncMap } from 'convex-helpers'
import { stream } from 'convex-helpers/server/stream'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import schema from './schema'
import { EMPTY_PAGE } from './lib/emptyPage'
import { findInRepoQuery } from './lib/findInRepo'
import { commitUrl } from './lib/gitProviders/urls'
import { withJobLinks, withPipelineLinks } from './lib/hostLinks'
import {
  repoMutation,
  repoQuery,
  zInternalMutation,
  zInternalQuery,
} from './lib/functions'
import { runsByJob } from './lib/runAggregates'
import { scopedStream } from './lib/scopedStream'
import { paginationOptsSchema } from '../src/lib/schemas/pagination'
import {
  ciRefSchema,
  runScopeSchema,
  runUploadSchema,
} from '../src/lib/schemas/run'
import type { ResolvedRunScope } from '../src/lib/schemas/run'
import type { RepoHost } from './lib/gitProviders/types'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type {
  CiPage,
  CommitLink,
  RunCiLink,
} from '../src/lib/schemas/host-links'
import type { TraceCounts } from '../src/lib/schemas/trace'

export type RunWithCounts = Doc<'runs'> & { traceCounts: TraceCounts }
export type RunDetail = RunWithCounts &
  CommitLink &
  RunCiLink & {
    job: (Doc<'ciJobs'> & CiPage & CommitLink) | null
    pipeline: (Doc<'ciPipelines'> & CiPage & CommitLink) | null
  }

const withTraceCounts = async (
  ctx: QueryCtx,
  run: Doc<'runs'>,
): Promise<RunWithCounts> => {
  const traceCounts: TraceCounts = await ctx.runQuery(
    internal.traceCounts.countRunTraces,
    { runId: run._id },
  )
  return { ...run, traceCounts }
}

/** `jobs` and `pipelines` the caller already loaded are used instead of fetching them again for every run. */
export const withRunDetails = async (
  ctx: QueryCtx & RepoHost,
  run: Doc<'runs'>,
  {
    jobs = [],
    pipelines = [],
  }: {
    jobs?: Array<Doc<'ciJobs'>>
    pipelines?: Array<Doc<'ciPipelines'>>
  } = {},
): Promise<RunDetail> => {
  const { repoId, jobId, pipelineId } = run
  const [counted, job, pipeline]: [
    RunWithCounts,
    Doc<'ciJobs'> | null,
    Doc<'ciPipelines'> | null,
  ] = await Promise.all([
    withTraceCounts(ctx, run),
    jobId === undefined
      ? null
      : (jobs.find(({ _id }) => _id === jobId) ??
        ctx.runQuery(internal.ciJobs.findInRepo, { repoId, id: jobId })),
    pipelineId === undefined
      ? null
      : (pipelines.find(({ _id }) => _id === pipelineId) ??
        ctx.runQuery(internal.ciPipelines.findInRepo, {
          repoId,
          id: pipelineId,
        })),
  ])
  const linkedJob = job && withJobLinks(ctx, job, pipeline)
  const linkedPipeline = pipeline && withPipelineLinks(ctx, pipeline)
  return {
    ...counted,
    commitUrl: commitUrl(ctx, run.sha),
    job: linkedJob,
    pipeline: linkedPipeline,
    ciUrl: linkedJob?.url ?? linkedPipeline?.url,
  }
}

export const findInRepo = findInRepoQuery('runs')

export const existsOnBranch = zInternalQuery({
  args: { repoId: zid('repos'), branch: z.string() },
  handler: async (ctx, { repoId, branch }) =>
    (await ctx.db
      .query('runs')
      .withIndex('by_repo_branch', (q) =>
        q.eq('repoId', repoId).eq('branch', branch),
      )
      .first()) !== null,
})

export const countForJob = zInternalQuery({
  args: { jobId: zid('ciJobs') },
  handler: (ctx, { jobId }) => runsByJob.count(ctx, { namespace: jobId }),
})

export const existsForJob = zInternalQuery({
  args: { jobId: zid('ciJobs') },
  handler: async (ctx, { jobId }) =>
    (await ctx.db
      .query('runs')
      .withIndex('by_job', (q) => q.eq('jobId', jobId))
      .first()) !== null,
})

export const getRun = repoQuery({
  args: { runId: zid('runs') },
  handler: async (ctx, { repoId, runId }): Promise<RunDetail | null> => {
    const run: Doc<'runs'> | null = await ctx.runQuery(
      internal.runs.findInRepo,
      { repoId, id: runId },
    )
    return run && withRunDetails(ctx, run)
  },
})

// Pinned runs first (latest pin first), then the rest newest first.
const PINNED_FIRST = ['pinnedAt', '_creationTime']

export const resolveScope = zInternalQuery({
  args: { repoId: zid('repos'), scope: runScopeSchema },
  handler: async (ctx, { repoId, scope }): Promise<ResolvedRunScope> => {
    if (scope.kind === 'branch') {
      const pullRequests: Array<Doc<'pullRequests'>> = await ctx.runQuery(
        internal.pullRequests.listOpenForBranch,
        { repoId, branchName: scope.branch },
      )
      return {
        branch: scope.branch,
        prNumbers: pullRequests.map(({ number }) => number),
      }
    }
    const pullRequest: Doc<'pullRequests'> | null = await ctx.runQuery(
      internal.pullRequests.getByNumber,
      { repoId, number: scope.number },
    )
    return {
      branch:
        pullRequest && !pullRequest.fromFork
          ? pullRequest.headBranch
          : undefined,
      prNumbers: [scope.number],
    }
  },
})

/** Runs on a branch plus runs of its pull requests, each once: a pull request's runs skip those already on the branch. */
export const listRuns = repoQuery({
  args: { scope: runScopeSchema, paginationOpts: paginationOptsSchema },
  handler: async (
    ctx,
    { repoId, scope, paginationOpts },
  ): Promise<PaginationResult<RunDetail>> => {
    const runs = stream(ctx.db, schema).query('runs')
    const scoped = await scopedStream(
      ctx,
      repoId,
      scope,
      {
        onBranch: (branch) =>
          runs
            .withIndex('by_repo_branch', (q) =>
              q.eq('repoId', repoId).eq('branch', branch),
            )
            .order('desc'),
        onPull: (prNumber) =>
          runs
            .withIndex('by_repo_pr', (q) =>
              q.eq('repoId', repoId).eq('prNumber', prNumber),
            )
            .order('desc'),
      },
      PINNED_FIRST,
    )
    return scoped
      .map((run) => withRunDetails(ctx, run))
      .paginate(paginationOpts)
  },
})

/** Runs uploaded for one job, newest first. */
export const listJobRuns = repoQuery({
  args: { jobId: zid('ciJobs'), paginationOpts: paginationOptsSchema },
  handler: async (
    ctx,
    { repoId, jobId, paginationOpts },
  ): Promise<PaginationResult<RunDetail>> => {
    const job: Doc<'ciJobs'> | null = await ctx.runQuery(
      internal.ciJobs.findInRepo,
      { repoId, id: jobId },
    )
    if (!job) return EMPTY_PAGE
    const pipeline: Doc<'ciPipelines'> | null =
      job.pipelineId === undefined
        ? null
        : await ctx.runQuery(internal.ciPipelines.findInRepo, {
            repoId,
            id: job.pipelineId,
          })
    return stream(ctx.db, schema)
      .query('runs')
      .withIndex('by_job', (q) => q.eq('jobId', jobId))
      .order('desc')
      .map((run) =>
        withRunDetails(ctx, run, {
          jobs: [job],
          pipelines: pipeline ? [pipeline] : [],
        }),
      )
      .paginate(paginationOpts)
  },
})

/** Runs uploaded for one pipeline, whether or not they name a job, newest first. */
export const listPipelineRuns = repoQuery({
  args: {
    pipelineId: zid('ciPipelines'),
    paginationOpts: paginationOptsSchema,
  },
  handler: async (
    ctx,
    { repoId, pipelineId, paginationOpts },
  ): Promise<PaginationResult<RunDetail>> => {
    const pipeline: Doc<'ciPipelines'> | null = await ctx.runQuery(
      internal.ciPipelines.findInRepo,
      { repoId, id: pipelineId },
    )
    if (!pipeline) return EMPTY_PAGE
    const jobs: Array<Doc<'ciJobs'>> = await ctx.runQuery(
      internal.ciJobs.listForPipeline,
      { pipelineId },
    )
    return stream(ctx.db, schema)
      .query('runs')
      .withIndex('by_pipeline', (q) => q.eq('pipelineId', pipelineId))
      .order('desc')
      .map((run) => withRunDetails(ctx, run, { jobs, pipelines: [pipeline] }))
      .paginate(paginationOpts)
  },
})

/** Resolves the pipeline and job an upload names to stored ones, creating what the host has not reported yet. */
export const resolveCi = zInternalMutation({
  args: {
    repoId: zid('repos'),
    sha: z.string(),
    branch: z.string().optional(),
    prNumber: z.number().optional(),
    ...ciRefSchema.shape,
  },
  handler: async (
    ctx,
    {
      repoId,
      sha,
      branch,
      prNumber,
      externalRunId,
      externalJobId,
      jobName,
      ciUrl,
    },
  ): Promise<{
    pipeline: Doc<'ciPipelines'> | null
    job: Doc<'ciJobs'> | null
  }> => {
    const namesJob = externalJobId !== undefined || jobName !== undefined
    const named: Doc<'ciPipelines'> | null =
      externalRunId === undefined
        ? null
        : await ctx.runMutation(internal.ciPipelines.ensurePipeline, {
            repoId,
            externalId: externalRunId,
            sha,
            branch,
            prNumber,
            url: namesJob ? undefined : ciUrl,
          })
    // Uploads may carry another commit than the pipeline (pull request workflows run on a merge commit), so jobs are stored at the pipeline's.
    const job: Doc<'ciJobs'> | null = namesJob
      ? await ctx.runMutation(internal.ciJobs.ensureJob, {
          repoId,
          sha: named?.sha ?? sha,
          pipelineId: named?._id,
          externalId: externalJobId,
          name: jobName,
          url: ciUrl,
        })
      : null
    const pipeline: Doc<'ciPipelines'> | null =
      named ??
      (job?.pipelineId === undefined
        ? null
        : await ctx.runQuery(internal.ciPipelines.findInRepo, {
            repoId,
            id: job.pipelineId,
          }))
    return { pipeline, job }
  },
})

export const getOrCreateRun = zInternalMutation({
  args: {
    repoId: zid('repos'),
    createdBy: z.string(),
    run: runUploadSchema,
    pinned: z.boolean(),
  },
  handler: async (
    ctx,
    { repoId, createdBy, run, pinned },
  ): Promise<Id<'runs'>> => {
    const { externalRunId, externalJobId, jobName, ciUrl, ...fields } = run
    if (run.branch !== undefined)
      await ctx.runMutation(internal.branches.ensureBranch, {
        repoId,
        name: run.branch,
        headSha: run.sha,
        createdBy,
      })
    const {
      pipeline,
      job,
    }: {
      pipeline: Doc<'ciPipelines'> | null
      job: Doc<'ciJobs'> | null
    } = await ctx.runMutation(internal.runs.resolveCi, {
      repoId,
      sha: run.sha,
      branch: run.branch,
      prNumber: run.prNumber,
      externalRunId,
      externalJobId,
      jobName,
      ciUrl,
    })
    if (pipeline || job) {
      const existing = await ctx.db
        .query('runs')
        .withIndex('by_repo_ci', (q) =>
          q
            .eq('repoId', repoId)
            .eq('sha', run.sha)
            .eq('pipelineId', pipeline?._id)
            .eq('jobId', job?._id),
        )
        .first()
      if (existing) return existing._id
    }
    return ctx.db.insert('runs', {
      repoId,
      createdBy,
      ...fields,
      pipelineId: pipeline?._id,
      jobId: job?._id,
      branch: run.branch ?? pipeline?.branch,
      prNumber: run.prNumber ?? pipeline?.prNumber,
      pinnedAt: pinned ? Date.now() : undefined,
    })
  },
})

// Runs of one job rarely number more than a few, so one batch normally covers them all.
const ATTACH_BATCH_SIZE = 100

/** Points a run at a pipeline and gives it the pipeline's branch and pull request where it states none. Its traces follow in batches. */
const attachRun = async (
  ctx: Pick<MutationCtx, 'db' | 'scheduler'>,
  run: Doc<'runs'>,
  pipeline: Doc<'ciPipelines'>,
): Promise<void> => {
  const branch = run.branch ?? pipeline.branch
  const prNumber = run.prNumber ?? pipeline.prNumber
  if (
    run.pipelineId === pipeline._id &&
    branch === run.branch &&
    prNumber === run.prNumber
  )
    return
  await ctx.db.patch('runs', run._id, {
    pipelineId: pipeline._id,
    branch,
    prNumber,
  })
  // A run can hold thousands of traces, so they follow in bounded batches.
  await ctx.scheduler.runAfter(0, internal.traces.syncRunScope, {
    runId: run._id,
  })
}

/** Gives the runs of pipelines the branch and pull request the host reports for them, keeping what an upload stated explicitly. */
export const adoptPipelines = zInternalMutation({
  args: { pipelineIds: z.array(zid('ciPipelines')) },
  handler: async (ctx, { pipelineIds }): Promise<void> => {
    await asyncMap(pipelineIds, async (pipelineId) => {
      const pipeline = await ctx.db.get('ciPipelines', pipelineId)
      if (
        !pipeline ||
        (pipeline.branch === undefined && pipeline.prNumber === undefined)
      )
        return
      const runs = await ctx.db
        .query('runs')
        .withIndex('by_pipeline', (q) => q.eq('pipelineId', pipelineId))
        .collect()
      await asyncMap(runs, (run) => attachRun(ctx, run, pipeline))
    })
  },
})

/**
 * Moves the runs of a job to the pipeline the job now belongs to (an upload attached it, or the host reported it in another),
 * so counts and lists by pipeline agree with those by job and a repeated upload finds its run again.
 */
export const attachJobRuns = zInternalMutation({
  args: {
    jobId: zid('ciJobs'),
    pipelineId: zid('ciPipelines'),
    cursor: z.string().nullable().optional(),
  },
  handler: async (ctx, { jobId, pipelineId, cursor }): Promise<void> => {
    const pipeline = await ctx.db.get('ciPipelines', pipelineId)
    if (!pipeline) return
    const { page, isDone, continueCursor } = await ctx.db
      .query('runs')
      .withIndex('by_job', (q) => q.eq('jobId', jobId))
      .paginate({ numItems: ATTACH_BATCH_SIZE, cursor: cursor ?? null })
    await asyncMap(page, (run) => attachRun(ctx, run, pipeline))
    if (!isDone)
      await ctx.scheduler.runAfter(0, internal.runs.attachJobRuns, {
        jobId,
        pipelineId,
        cursor: continueCursor,
      })
  },
})

export const setRunPinned = repoMutation({
  args: { runId: zid('runs'), pinned: z.boolean() },
  handler: async (ctx, { repoId, runId, pinned }): Promise<void> => {
    const run: Doc<'runs'> | null = await ctx.runQuery(
      internal.runs.findInRepo,
      { repoId, id: runId },
    )
    if (!run) throw new ConvexError('Run not found')
    if (pinned && run.prNumber === undefined)
      throw new ConvexError(
        'Only runs attached to a pull request can be pinned',
      )
    await ctx.db.patch('runs', runId, {
      pinnedAt: pinned ? Date.now() : undefined,
    })
  },
})
