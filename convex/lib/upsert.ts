import type { WithoutSystemFields } from 'convex/server'
import type { Doc, Id, TableNames } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

/**
 * Replaces `existing` (keeping its id) or inserts `doc`. Replacing, not patching, clears fields the host dropped, e.g. a description.
 * The caller finds `existing` through the table's internal query.
 */
export const replaceOrInsert = async <TTable extends TableNames>(
  ctx: Pick<MutationCtx, 'db'>,
  table: TTable,
  existing: Doc<TTable> | null,
  doc: WithoutSystemFields<Doc<TTable>>,
): Promise<Id<TTable>> => {
  // Convex's document types cannot be related to `doc` for a generic table name.
  if (!existing) return ctx.db.insert(table, doc)
  await ctx.db.replace(table, existing._id, doc as never)
  return existing._id
}
