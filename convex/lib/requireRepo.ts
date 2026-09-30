import { ConvexError } from 'convex/values'
import { api } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'
import type { ActionCtx, QueryCtx } from '../_generated/server'

/** The repo if the current user can access it, else throws; access is whatever `getRepo` decides. */
export async function requireRepo(
  ctx: QueryCtx | ActionCtx,
  repoId: Id<'repos'>,
): Promise<Doc<'repos'>> {
  const repo = await ctx.runQuery(api.repos.getRepo, { repoId })
  if (!repo) throw new ConvexError('Repository not found')
  return repo
}
