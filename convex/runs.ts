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
import { runSchema, runScopeSchema } from '../src/lib/schemas/run'
import type { ResolvedRunScope } from '../src/lib/schemas/run'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import type { TraceCounts } from '../src/lib/schemas/trace'

export type RunWithCounts = Doc<'runs'> & { traceCounts: TraceCounts }

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

export const findInRepo = zInternalQuery({
  args: { repoId: zid('repos'), runId: zid('runs') },
  handler: async (ctx, { repoId, runId }) => {
    const run = await ctx.db.get('runs', runId)
    return run?.repoId === repoId ? run : null
  },
})

export const listForSha = zInternalQuery({
  args: { repoId: zid('repos'), sha: z.string() },
  handler: (ctx, { repoId, sha }) =>
    ctx.db
      .query('runs')
      .withIndex('by_repo_identity', (q) =>
        q.eq('repoId', repoId).eq('sha', sha),
      )
      .collect(),
})

export const getRun = repoQuery({
  args: { runId: zid('runs') },
  handler: async (
    ctx,
    { repoId, runId },
  ): Promise<(RunWithCounts & { job: Doc<'ciJobs'> | null }) | null> => {
    const run: Doc<'runs'> | null = await ctx.runQuery(
      internal.runs.findInRepo,
      { repoId, runId },
    )
    if (!run) return null
    const job: Doc<'ciJobs'> | null = await ctx.runQuery(
      internal.ciJobs.findForRun,
      { repoId, runId },
    )
    return { ...(await withTraceCounts(ctx, run)), job }
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
  ): Promise<PaginationResult<RunWithCounts>> => {
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
      .map((run) => withTraceCounts(ctx, run))
      .paginate(paginationOpts)
  },
})

export const getOrCreateRun = zInternalMutation({
  args: {
    repoId: zid('repos'),
    createdBy: z.string(),
    run: runSchema.omit({ pinnedAt: true }),
    pinned: z.boolean(),
  },
  handler: async (ctx, { repoId, createdBy, run, pinned }) => {
    if (run.externalRunId !== undefined || run.externalJobId !== undefined) {
      const existing = await ctx.db
        .query('runs')
        .withIndex('by_repo_identity', (q) =>
          q
            .eq('repoId', repoId)
            .eq('sha', run.sha)
            .eq('externalRunId', run.externalRunId)
            .eq('externalJobId', run.externalJobId),
        )
        .unique()
      if (existing) return existing._id
    }
    return ctx.db.insert('runs', {
      repoId,
      createdBy,
      ...run,
      pinnedAt: pinned ? Date.now() : undefined,
    })
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
