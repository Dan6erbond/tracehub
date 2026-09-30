import { z } from 'zod'
import { ConvexError } from 'convex/values'
import type { PaginationResult } from 'convex/server'
import { asyncMap } from 'convex-helpers'
import { mergedStream, stream } from 'convex-helpers/server/stream'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import schema from './schema'
import {
  repoAction,
  repoQuery,
  zInternalMutation,
  zInternalQuery,
} from './lib/functions'
import { getProviderAccessToken } from './lib/gitProviders/getAccessToken'
import { gitProviders } from './lib/gitProviders'
import { replaceOrInsert } from './lib/upsert'
import { withRunDetails, withTraceCounts } from './runs'
import { attachRuns } from './ciJobs'
import { ciPipelineSchema } from '../src/lib/schemas/ci-pipeline'
import { paginationOptsSchema } from '../src/lib/schemas/pagination'
import { runScopeSchema } from '../src/lib/schemas/run'
import { httpUrlSchema } from '../src/lib/schemas/url'
import { sumTraceCounts } from '../src/lib/trace-counts'
import type { ResolvedRunScope } from '../src/lib/schemas/run'
import type { TraceCounts } from '../src/lib/schemas/trace'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import type { CiJobWithRuns } from './ciJobs'
import type { RunDetail } from './runs'

export type PipelineWithCounts = Doc<'ciPipelines'> & {
  traceCounts: TraceCounts
}
export type PipelineDetail = PipelineWithCounts & {
  jobs: Array<CiJobWithRuns>
  // Runs of the pipeline that name no job.
  unlinkedRuns: Array<RunDetail>
}

export const findInRepo = zInternalQuery({
  args: { repoId: zid('repos'), pipelineId: zid('ciPipelines') },
  handler: async (ctx, { repoId, pipelineId }) => {
    const pipeline = await ctx.db.get('ciPipelines', pipelineId)
    return pipeline?.repoId === repoId ? pipeline : null
  },
})

export const findByExternalId = zInternalQuery({
  args: { repoId: zid('repos'), externalId: z.string() },
  handler: (ctx, { repoId, externalId }) =>
    ctx.db
      .query('ciPipelines')
      .withIndex('by_repo_externalId', (q) =>
        q.eq('repoId', repoId).eq('externalId', externalId),
      )
      .unique(),
})

export const latestForBranch = zInternalQuery({
  args: { repoId: zid('repos'), branch: z.string() },
  handler: (ctx, { repoId, branch }) =>
    ctx.db
      .query('ciPipelines')
      .withIndex('by_repo_branch', (q) =>
        q.eq('repoId', repoId).eq('branch', branch),
      )
      .order('desc')
      .first(),
})

/** The pipeline an upload runs in, created when the host has not reported it yet; the next sync replaces it, keeping the id. */
export const ensurePipeline = zInternalMutation({
  args: {
    repoId: zid('repos'),
    externalId: z.string(),
    sha: z.string(),
    branch: z.string().optional(),
    prNumber: z.number().optional(),
    url: httpUrlSchema.optional(),
  },
  handler: async (ctx, { repoId, ...stub }): Promise<Id<'ciPipelines'>> => {
    const existing: Doc<'ciPipelines'> | null = await ctx.runQuery(
      internal.ciPipelines.findByExternalId,
      { repoId, externalId: stub.externalId },
    )
    return (
      existing?._id ??
      ctx.db.insert('ciPipelines', {
        repoId,
        name: 'Pipeline',
        startedAt: Date.now(),
        ...stub,
      })
    )
  },
})

export const upsertPipelines = zInternalMutation({
  args: { repoId: zid('repos'), pipelines: z.array(ciPipelineSchema) },
  handler: async (ctx, { repoId, pipelines }) => {
    for (const pipeline of pipelines) {
      const existing: Doc<'ciPipelines'> | null = await ctx.runQuery(
        internal.ciPipelines.findByExternalId,
        { repoId, externalId: pipeline.externalId },
      )
      // Runs triggered by a tag report the tag as their head branch, so only names of known branches count.
      const branch: Doc<'branches'> | null =
        pipeline.branch === undefined
          ? null
          : await ctx.runQuery(internal.branches.findByName, {
              repoId,
              name: pipeline.branch,
            })
      const pipelineId = await replaceOrInsert(ctx, 'ciPipelines', existing, {
        repoId,
        ...pipeline,
        branch: branch?.name,
      })
      await ctx.runMutation(internal.runs.adoptPipeline, { pipelineId })
    }
  },
})

const jobsOfPipeline = (
  ctx: QueryCtx,
  pipeline: Doc<'ciPipelines'>,
): Promise<Array<Doc<'ciJobs'>>> =>
  ctx.runQuery(internal.ciJobs.listForPipeline, { pipelineId: pipeline._id })

const runsOfPipeline = async (
  ctx: QueryCtx,
  pipeline: Doc<'ciPipelines'>,
): Promise<Array<Doc<'runs'>>> =>
  ctx.runQuery(internal.runs.listForPipeline, { pipelineId: pipeline._id })

const withCounts = async (
  ctx: QueryCtx,
  pipeline: Doc<'ciPipelines'>,
): Promise<PipelineWithCounts> => {
  const runs = await asyncMap(await runsOfPipeline(ctx, pipeline), (run) =>
    withTraceCounts(ctx, run),
  )
  return {
    ...pipeline,
    traceCounts: sumTraceCounts(runs.map((run) => run.traceCounts)),
  }
}

/** Pipelines of a branch plus those of its pull requests, each once; without a scope, every pipeline of the repo. All newest first. */
export const listPipelines = repoQuery({
  args: {
    scope: runScopeSchema.optional(),
    paginationOpts: paginationOptsSchema,
  },
  handler: async (
    ctx,
    { repoId, scope, paginationOpts },
  ): Promise<PaginationResult<PipelineWithCounts>> => {
    const pipelines = stream(ctx.db, schema).query('ciPipelines')
    if (!scope)
      return pipelines
        .withIndex('by_repo_startedAt', (q) => q.eq('repoId', repoId))
        .order('desc')
        .map((pipeline) => withCounts(ctx, pipeline))
        .paginate(paginationOpts)
    const { branch, prNumbers }: ResolvedRunScope = await ctx.runQuery(
      internal.runs.resolveScope,
      { repoId, scope },
    )
    const onBranch =
      branch === undefined
        ? []
        : [
            pipelines
              .withIndex('by_repo_branch', (q) =>
                q.eq('repoId', repoId).eq('branch', branch),
              )
              .order('desc'),
          ]
    const onPulls = prNumbers.map((prNumber) =>
      pipelines
        .withIndex('by_repo_pr', (q) =>
          q.eq('repoId', repoId).eq('prNumber', prNumber),
        )
        .order('desc')
        .filterWith((pipeline) => Promise.resolve(pipeline.branch !== branch)),
    )
    return mergedStream(
      [...onBranch, ...onPulls],
      ['startedAt', '_creationTime'],
    )
      .map((pipeline) => withCounts(ctx, pipeline))
      .paginate(paginationOpts)
  },
})

export const getPipeline = repoQuery({
  args: { pipelineId: zid('ciPipelines') },
  handler: async (
    ctx,
    { repoId, pipelineId },
  ): Promise<PipelineDetail | null> => {
    const pipeline: Doc<'ciPipelines'> | null = await ctx.runQuery(
      internal.ciPipelines.findInRepo,
      { repoId, pipelineId },
    )
    if (!pipeline) return null
    const jobs = await jobsOfPipeline(ctx, pipeline)
    const runs = await asyncMap(await runsOfPipeline(ctx, pipeline), (run) =>
      withRunDetails(ctx, run),
    )
    return {
      ...pipeline,
      traceCounts: sumTraceCounts(runs.map((run) => run.traceCounts)),
      jobs: attachRuns(jobs, runs),
      unlinkedRuns: runs.filter((run) => run.jobId === undefined),
    }
  },
})

/** Fetches the jobs of a pipeline from the Git host, for pipelines older than the branch heads whose jobs the reload syncs. */
export const loadJobs = repoAction({
  args: { pipelineId: zid('ciPipelines') },
  handler: async (ctx, { repoId, pipelineId }) => {
    const pipeline: Doc<'ciPipelines'> | null = await ctx.runQuery(
      internal.ciPipelines.findInRepo,
      { repoId, pipelineId },
    )
    if (!pipeline) throw new ConvexError('Pipeline not found')
    const adapter = gitProviders[ctx.repo.provider]
    const accessToken = await getProviderAccessToken(ctx, ctx.repo.provider)
    const jobs = await adapter.listPipelineJobs(accessToken, ctx.repo, pipeline)
    await ctx.runMutation(internal.ciJobs.upsertJobs, {
      repoId,
      jobs,
      syncedAt: Date.now(),
    })
  },
})
