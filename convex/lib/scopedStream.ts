import { mergedStream } from 'convex-helpers/server/stream'
import { internal } from '../_generated/api'
import type { QueryStream } from 'convex-helpers/server/stream'
import type { Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import type { ResolvedRunScope, RunScope } from '../../src/lib/schemas/run'

/**
 * Rows on a branch plus those of its pull requests, each once: a pull request's rows skip those already on the branch.
 * `onBranch` and `onPull` open the table's index streams for one branch or pull request.
 */
export const scopedStream = async <T extends { branch?: string }>(
  ctx: QueryCtx,
  repoId: Id<'repos'>,
  scope: RunScope,
  {
    onBranch,
    onPull,
  }: {
    onBranch: (branch: string) => QueryStream<T>
    onPull: (prNumber: number) => QueryStream<T>
  },
  orderBy: Array<string>,
): Promise<QueryStream<T>> => {
  const { branch, prNumbers }: ResolvedRunScope = await ctx.runQuery(
    internal.runs.resolveScope,
    { repoId, scope },
  )
  return mergedStream(
    [
      ...(branch === undefined ? [] : [onBranch(branch)]),
      ...prNumbers.map((prNumber) =>
        onPull(prNumber).filterWith((row) =>
          Promise.resolve(row.branch !== branch),
        ),
      ),
    ],
    orderBy,
  )
}
