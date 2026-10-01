import { z } from 'zod'
import { ConvexError } from 'convex/values'
import type { PaginationResult } from 'convex/server'
import { asyncMap } from 'convex-helpers'
import { stream } from 'convex-helpers/server/stream'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import schema from './schema'
import { findInRepoQuery } from './lib/findInRepo'
import {
  repoAction,
  repoQuery,
  zInternalMutation,
  zInternalQuery,
} from './lib/functions'
import { getProviderAccessToken } from './lib/gitProviders/getAccessToken'
import { gitProviders } from './lib/gitProviders'
import { withPipelineLinks } from './lib/hostLinks'
import { scopedStream } from './lib/scopedStream'
import { insertAndGet, replaceOrInsert, uniqueBy } from './lib/upsert'
import { ciPipelineSchema } from '../src/lib/schemas/ci-pipeline'
import { paginationOptsSchema } from '../src/lib/schemas/pagination'
import { runScopeSchema } from '../src/lib/schemas/run'
import { httpUrlSchema } from '../src/lib/schemas/url'
import type { TraceCounts } from '../src/lib/schemas/trace'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import type { CiPage, CommitLink } from '../src/lib/schemas/host-links'

export type PipelineWithCounts = Doc<'ciPipelines'> &
  CiPage &
  CommitLink & {
    traceCounts: TraceCounts
  }

export const findInRepo = findInRepoQuery('ciPipelines')

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
  handler: async (ctx, { repoId, ...stub }): Promise<Doc<'ciPipelines'>> => {
    const existing: Doc<'ciPipelines'> | null = await ctx.runQuery(
      internal.ciPipelines.findByExternalId,
      { repoId, externalId: stub.externalId },
    )
    return (
      existing ??
      insertAndGet(ctx, 'ciPipelines', {
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
    const stored = await asyncMap(
      uniqueBy(pipelines, ({ externalId }) => externalId),
      async (pipeline) => {
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
        return replaceOrInsert(ctx, 'ciPipelines', existing, {
          repoId,
          ...pipeline,
          branch: branch?.name,
        })
      },
    )
    await ctx.runMutation(internal.runs.adoptPipelines, {
      pipelineIds: stored.map(({ _id }) => _id),
    })
  },
})

const withCounts = async (
  ctx: QueryCtx,
  repo: Doc<'repos'>,
  pipeline: Doc<'ciPipelines'>,
): Promise<PipelineWithCounts> => ({
  ...withPipelineLinks(repo, pipeline),
  traceCounts: await ctx.runQuery(internal.traceCounts.countPipelineTraces, {
    pipelineId: pipeline._id,
  }),
})

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
        .map((pipeline) => withCounts(ctx, ctx.repo, pipeline))
        .paginate(paginationOpts)
    const scoped = await scopedStream(
      ctx,
      repoId,
      scope,
      {
        onBranch: (branch) =>
          pipelines
            .withIndex('by_repo_branch', (q) =>
              q.eq('repoId', repoId).eq('branch', branch),
            )
            .order('desc'),
        onPull: (prNumber) =>
          pipelines
            .withIndex('by_repo_pr', (q) =>
              q.eq('repoId', repoId).eq('prNumber', prNumber),
            )
            .order('desc'),
      },
      ['startedAt', '_creationTime'],
    )
    return scoped
      .map((pipeline) => withCounts(ctx, ctx.repo, pipeline))
      .paginate(paginationOpts)
  },
})

export const getPipeline = repoQuery({
  args: { pipelineId: zid('ciPipelines') },
  handler: async (
    ctx,
    { repoId, pipelineId },
  ): Promise<PipelineWithCounts | null> => {
    const pipeline: Doc<'ciPipelines'> | null = await ctx.runQuery(
      internal.ciPipelines.findInRepo,
      { repoId, id: pipelineId },
    )
    return pipeline && withCounts(ctx, ctx.repo, pipeline)
  },
})

/** Fetches the jobs of a pipeline from the Git host, for pipelines older than the branch heads whose jobs the reload syncs. */
export const loadJobs = repoAction({
  args: { pipelineId: zid('ciPipelines') },
  handler: async (ctx, { repoId, pipelineId }) => {
    const pipeline: Doc<'ciPipelines'> | null = await ctx.runQuery(
      internal.ciPipelines.findInRepo,
      { repoId, id: pipelineId },
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
