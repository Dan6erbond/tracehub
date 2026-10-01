import { ConvexError } from 'convex/values'
import type { WithoutSystemFields } from 'convex/server'
import type { Doc, TableNames } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export const insertAndGet = async <TTable extends TableNames>(
  ctx: Pick<MutationCtx, 'db'>,
  table: TTable,
  doc: WithoutSystemFields<Doc<TTable>>,
): Promise<Doc<TTable>> => {
  const inserted = await ctx.db.get(table, await ctx.db.insert(table, doc))
  if (!inserted) throw new ConvexError('Inserted document not found')
  return inserted
}

/**
 * Replaces `existing` (keeping its id) or inserts `doc`. Replacing, not patching, clears fields the host dropped, e.g. a description.
 * The caller finds `existing` through the table's internal query.
 */
export const replaceOrInsert = async <TTable extends TableNames>(
  ctx: Pick<MutationCtx, 'db'>,
  table: TTable,
  existing: Doc<TTable> | null,
  doc: WithoutSystemFields<Doc<TTable>>,
): Promise<Doc<TTable>> => {
  if (!existing) return insertAndGet(ctx, table, doc)
  // Convex's document types cannot be related to `doc` for a generic table name.
  await ctx.db.replace(table, existing._id, doc as never)
  return {
    ...doc,
    _id: existing._id,
    _creationTime: existing._creationTime,
  }
}

/**
 * Parallel upserts race on duplicate keys (both see no row and insert), so a batch is deduped first; the last item wins, as when applied in order.
 */
export const uniqueBy = <T>(items: Array<T>, keyOf: (item: T) => string) => [
  ...new Map(items.map((item) => [keyOf(item), item])).values(),
]
