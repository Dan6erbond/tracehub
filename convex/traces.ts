import { ConvexError } from 'convex/values'
import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod4'
import { internal } from './_generated/api'
import {
  repoMutation,
  repoQuery,
  zInternalMutation,
  zInternalQuery,
} from './lib/functions'
import {
  addTracesInputSchema,
  createRunInputSchema,
  runScopeSchema,
} from '../src/lib/schemas/run'
import { traceInputSchema } from '../src/lib/schemas/trace'
import type { Doc, Id } from './_generated/dataModel'
import type { ResolvedRunScope } from '../src/lib/schemas/run'
import type { TraceCounts } from '../src/lib/schemas/trace'

export const generateUploadUrl = repoMutation({
  args: {},
  handler: (ctx) => ctx.storage.generateUploadUrl(),
})

export const insertTraces = zInternalMutation({
  args: { runId: zid('runs'), traces: z.array(traceInputSchema) },
  handler: async (ctx, { runId, traces }) => {
    const run = await ctx.db.get('runs', runId)
    if (!run) throw new ConvexError('Run not found')
    const { repoId, branch, prNumber } = run
    for (const trace of traces)
      await ctx.db.insert('traces', {
        repoId,
        runId,
        branch,
        prNumber,
        ...trace,
      })
  },
})

export const createRunWithTraces = repoMutation({
  args: createRunInputSchema,
  handler: async (
    ctx,
    { repoId, traces, pinned, ...run },
  ): Promise<Id<'runs'>> => {
    const runId: Id<'runs'> = await ctx.runMutation(
      internal.runs.getOrCreateRun,
      { repoId, createdBy: ctx.userId, run, pinned },
    )
    await ctx.runMutation(internal.traces.insertTraces, { runId, traces })
    return runId
  },
})

export const addTracesToRun = repoMutation({
  args: { runId: zid('runs'), ...addTracesInputSchema.shape },
  handler: async (ctx, { repoId, runId, traces }): Promise<void> => {
    const run: Doc<'runs'> | null = await ctx.runQuery(
      internal.runs.findInRepo,
      { repoId, runId },
    )
    if (!run) throw new ConvexError('Run not found')
    await ctx.runMutation(internal.traces.insertTraces, { runId, traces })
  },
})

export const listTraces = repoQuery({
  args: { runId: zid('runs') },
  handler: async (ctx, { repoId, runId }): Promise<Array<Doc<'traces'>>> => {
    const run: Doc<'runs'> | null = await ctx.runQuery(
      internal.runs.findInRepo,
      { repoId, runId },
    )
    if (!run) return []
    return ctx.db
      .query('traces')
      .withIndex('by_run', (q) => q.eq('runId', runId))
      .collect()
  },
})

export const findInRepo = zInternalQuery({
  args: { repoId: zid('repos'), traceId: zid('traces') },
  handler: async (ctx, { repoId, traceId }) => {
    const trace = await ctx.db.get('traces', traceId)
    return trace?.repoId === repoId ? trace : null
  },
})

export const getTrace = repoQuery({
  args: { traceId: zid('traces') },
  handler: (ctx, { repoId, traceId }): Promise<Doc<'traces'> | null> =>
    ctx.runQuery(internal.traces.findInRepo, { repoId, traceId }),
})

export const getTraceFileUrl = repoQuery({
  args: { traceId: zid('traces') },
  handler: async (ctx, { repoId, traceId }): Promise<string | null> => {
    const trace: Doc<'traces'> | null = await ctx.runQuery(
      internal.traces.findInRepo,
      { repoId, traceId },
    )
    return trace && ctx.storage.getUrl(trace.storageId)
  },
})

export const getScopeCounts = repoQuery({
  args: { scope: runScopeSchema },
  handler: async (ctx, { repoId, scope }): Promise<TraceCounts> => {
    const resolved: ResolvedRunScope = await ctx.runQuery(
      internal.runs.resolveScope,
      { repoId, scope },
    )
    return ctx.runQuery(internal.traceCounts.countScopeTraces, {
      repoId,
      scope: resolved,
    })
  },
})
