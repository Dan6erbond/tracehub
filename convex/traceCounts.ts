import { asyncMap } from 'convex-helpers'
import { zid } from 'convex-helpers/server/zod4'
import { zInternalQuery } from './lib/functions'
import {
  tracesByBranch,
  tracesByPipeline,
  tracesByPull,
  tracesByRun,
} from './lib/traceAggregates'
import { resolvedRunScopeSchema } from '../src/lib/schemas/run'
import { traceStatusSchema } from '../src/lib/schemas/trace'
import type { TraceCounts, TraceStatus } from '../src/lib/schemas/trace'

const toCounts = async (
  countOf: (status: TraceStatus) => Promise<number>,
): Promise<TraceCounts> => {
  const entries = await Promise.all(
    traceStatusSchema.options.map(
      async (status) => [status, await countOf(status)] as const,
    ),
  )
  const byStatus = Object.fromEntries(entries) as TraceCounts['byStatus']
  return {
    total: entries.reduce((sum, [, count]) => sum + count, 0),
    byStatus,
  }
}

export const countRunTraces = zInternalQuery({
  args: { runId: zid('runs') },
  handler: (ctx, { runId }) =>
    toCounts((status) =>
      tracesByRun.count(ctx, {
        namespace: runId,
        bounds: { prefix: [status] },
      }),
    ),
})

export const countPipelineTraces = zInternalQuery({
  args: { pipelineId: zid('ciPipelines') },
  handler: (ctx, { pipelineId }) =>
    toCounts((status) =>
      tracesByPipeline.count(ctx, {
        namespace: pipelineId,
        bounds: { prefix: [status] },
      }),
    ),
})

/**
 * Traces of a branch plus those of its pull requests. A trace on both is counted
 * once: pull request counts subtract the ones already on the branch.
 */
export const countScopeTraces = zInternalQuery({
  args: { repoId: zid('repos'), scope: resolvedRunScopeSchema },
  handler: (ctx, { repoId, scope: { branch, prNumbers } }) =>
    toCounts(async (status) => {
      const [onBranch, onPullsOnly] = await Promise.all([
        branch === undefined
          ? 0
          : tracesByBranch.count(ctx, {
              namespace: repoId,
              bounds: { prefix: [branch, status] },
            }),
        asyncMap(prNumbers, async (prNumber) => {
          const [onPull, alsoOnBranch] = await Promise.all([
            tracesByPull.count(ctx, {
              namespace: repoId,
              bounds: { prefix: [prNumber, status] },
            }),
            branch === undefined
              ? 0
              : tracesByPull.count(ctx, {
                  namespace: repoId,
                  bounds: { prefix: [prNumber, status, branch] },
                }),
          ])
          return onPull - alsoOnBranch
        }),
      ])
      return onPullsOnly.reduce((sum, count) => sum + count, onBranch)
    }),
})
