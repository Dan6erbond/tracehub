import { z } from 'zod'
import type { PaginationResult } from 'convex/server'
import { mergedStream, stream } from 'convex-helpers/server/stream'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import schema from './schema'
import {
  repoMutation,
  repoQuery,
  zInternalMutation,
  zInternalQuery,
} from './lib/functions'
import { paginationOptsSchema } from '../src/lib/schemas/pagination'
import {
  ciRefSchema,
  runScopeSchema,
  runUploadSchema,
} from '../src/lib/schemas/run'
import type { ResolvedRunScope } from '../src/lib/schemas/run'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import type { TraceCounts } from '../src/lib/schemas/trace'

export type RunWithCounts = Doc<'runs'> & { traceCounts: TraceCounts }
export type RunDetail = RunWithCounts & {
  job: Doc<'ciJobs'> | null
  pipeline: Doc<'ciPipelines'> | null
}

export const withTraceCounts = async (
  ctx: QueryCtx,
  run: Doc<'runs'>,
): Promise<RunWithCounts> => {
  const traceCounts: TraceCounts = await ctx.runQuery(
    internal.traceCounts.countRunTraces,
    { runId: run._id },
  )
  return { ...run, traceCounts }
}

export const withRunDetails = async (
  ctx: QueryCtx,
  run: Doc<'runs'>,
): Promise<RunDetail> => {
  const [counted, job, pipeline]: [
    RunWithCounts,
    Doc<'ciJobs'> | null,
    Doc<'ciPipelines'> | null,
  ] = await Promise.all([
    withTraceCounts(ctx, run),
    run.jobId === undefined
      ? null
      : ctx.runQuery(internal.ciJobs.findInRepo, {
          repoId: run.repoId,
          jobId: run.jobId,
        }),
    run.pipelineId === undefined
      ? null
      : ctx.runQuery(internal.ciPipelines.findInRepo, {
          repoId: run.repoId,
          pipelineId: run.pipelineId,
        }),
  ])
  return { ...counted, job, pipeline }
}

export const findInRepo = zInternalQuery({
  args: { repoId: zid('repos'), runId: zid('runs') },
  handler: async (ctx, { repoId, runId }) => {
    const run = await ctx.db.get('runs', runId)
    return run?.repoId === repoId ? run : null
  },
})

export const listForPipeline = zInternalQuery({
  args: { pipelineId: zid('ciPipelines') },
  handler: (ctx, { pipelineId }) =>
    ctx.db
      .query('runs')
      .withIndex('by_pipeline', (q) => q.eq('pipelineId', pipelineId))
      .collect(),
})

export const listForJob = zInternalQuery({
  args: { jobId: zid('ciJobs') },
  handler: (ctx, { jobId }) =>
    ctx.db
      .query('runs')
      .withIndex('by_job', (q) => q.eq('jobId', jobId))
      .collect(),
})

export const getRun = repoQuery({
  args: { runId: zid('runs') },
  handler: async (ctx, { repoId, runId }): Promise<RunDetail | null> => {
    const run: Doc<'runs'> | null = await ctx.runQuery(
      internal.runs.findInRepo,
      { repoId, runId },
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
    const { branch, prNumbers }: ResolvedRunScope = await ctx.runQuery(
      internal.runs.resolveScope,
      { repoId, scope },
    )
    const runs = stream(ctx.db, schema).query('runs')
    const onBranch =
      branch === undefined
        ? []
        : [
            runs
              .withIndex('by_repo_branch', (q) =>
                q.eq('repoId', repoId).eq('branch', branch),
              )
              .order('desc'),
          ]
    const onPulls = prNumbers.map((prNumber) =>
      runs
        .withIndex('by_repo_pr', (q) =>
          q.eq('repoId', repoId).eq('prNumber', prNumber),
        )
        .order('desc')
        .filterWith((run) => Promise.resolve(run.branch !== branch)),
    )
    return mergedStream([...onBranch, ...onPulls], PINNED_FIRST)
      .map((run) => withRunDetails(ctx, run))
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
    pipelineId: Id<'ciPipelines'> | undefined
    jobId: Id<'ciJobs'> | undefined
  }> => {
    const namesJob = externalJobId !== undefined || jobName !== undefined
    const namedPipelineId: Id<'ciPipelines'> | undefined =
      externalRunId === undefined
        ? undefined
        : await ctx.runMutation(internal.ciPipelines.ensurePipeline, {
            repoId,
            externalId: externalRunId,
            sha,
            branch,
            prNumber,
            url: namesJob ? undefined : ciUrl,
          })
    const job: Doc<'ciJobs'> | null = namesJob
      ? await ctx.runMutation(internal.ciJobs.ensureJob, {
          repoId,
          sha,
          pipelineId: namedPipelineId,
          externalId: externalJobId,
          name: jobName,
          url: ciUrl,
        })
      : null
    return {
      pipelineId: namedPipelineId ?? job?.pipelineId,
      jobId: job?._id,
    }
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
    const {
      pipelineId,
      jobId,
    }: {
      pipelineId: Id<'ciPipelines'> | undefined
      jobId: Id<'ciJobs'> | undefined
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
    if (pipelineId !== undefined || jobId !== undefined) {
      const existing = await ctx.db
        .query('runs')
        .withIndex('by_repo_ci', (q) =>
          q
            .eq('repoId', repoId)
            .eq('sha', run.sha)
            .eq('pipelineId', pipelineId)
            .eq('jobId', jobId),
        )
        .first()
      if (existing) return existing._id
    }
    const pipeline: Doc<'ciPipelines'> | null =
      pipelineId === undefined
        ? null
        : await ctx.runQuery(internal.ciPipelines.findInRepo, {
            repoId,
            pipelineId,
          })
    return ctx.db.insert('runs', {
      repoId,
      createdBy,
      ...fields,
      pipelineId,
      jobId,
      branch: run.branch ?? pipeline?.branch,
      prNumber: run.prNumber ?? pipeline?.prNumber,
      pinnedAt: pinned ? Date.now() : undefined,
    })
  },
})

/** Gives the runs of a pipeline the branch and pull request the host reports for it, keeping what an upload stated explicitly. */
export const adoptPipeline = zInternalMutation({
  args: { pipelineId: zid('ciPipelines') },
  handler: async (ctx, { pipelineId }): Promise<void> => {
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
    for (const run of runs) {
      const branch = run.branch ?? pipeline.branch
      const prNumber = run.prNumber ?? pipeline.prNumber
      if (branch === run.branch && prNumber === run.prNumber) continue
      await ctx.db.patch('runs', run._id, { branch, prNumber })
      // A run can hold thousands of traces, so they follow in bounded batches.
      await ctx.scheduler.runAfter(0, internal.traces.syncRunScope, {
        runId: run._id,
      })
    }
  },
})

export const setRunPinned = repoMutation({
  args: { runId: zid('runs'), pinned: z.boolean() },
  handler: async (ctx, { repoId, runId, pinned }): Promise<void> => {
    const run: Doc<'runs'> | null = await ctx.runQuery(
      internal.runs.findInRepo,
      { repoId, runId },
    )
    if (!run) throw new Error('Run not found')
    if (pinned && run.prNumber === undefined)
      throw new Error('Only runs attached to a pull request can be pinned')
    await ctx.db.patch('runs', runId, {
      pinnedAt: pinned ? Date.now() : undefined,
    })
  },
})
