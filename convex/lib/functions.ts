import { ConvexError, v } from 'convex/values'
import {
  NoOp,
  customCtx,
  customMutation,
} from 'convex-helpers/server/customFunctions'
import {
  zCustomAction,
  zCustomMutation,
  zCustomQuery,
} from 'convex-helpers/server/zod4'
import { internal } from '../_generated/api'
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from '../_generated/server'
import { triggers } from './triggers'
import { errorCodes } from '../../src/lib/errors'
import type { Doc, Id } from '../_generated/dataModel'
import type { ActionCtx, MutationCtx, QueryCtx } from '../_generated/server'

const withTriggers = customCtx((ctx: MutationCtx) => ({
  db: triggers.wrapDB(ctx).db,
}))
const mutationWithTriggers = customMutation(mutation, withTriggers)

export const zInternalQuery = zCustomQuery(internalQuery, NoOp)
export const zInternalMutation = zCustomMutation(
  customMutation(internalMutation, withTriggers),
  NoOp,
)

const requireUserId = async (ctx: QueryCtx | ActionCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity)
    throw new ConvexError({
      code: errorCodes.unauthenticated,
      message: 'Unauthenticated',
    })
  return { userId: identity.subject }
}

export const authedQuery = zCustomQuery(query, customCtx(requireUserId))
export const authedAction = zCustomAction(action, customCtx(requireUserId))

/** Adds `userId` and the repo (`ctx.repo`) the user can access, else throws; access is whatever `getUserRepo` decides. */
const requireRepoAccess = async (
  ctx: QueryCtx | MutationCtx | ActionCtx,
  repoId: Id<'repos'>,
): Promise<{ userId: string; repo: Doc<'repos'> }> => {
  const { userId } = await requireUserId(ctx)
  const repo: Doc<'repos'> | null = await ctx.runQuery(
    internal.repos.getUserRepo,
    { userId, repoId },
  )
  if (!repo)
    throw new ConvexError({
      code: errorCodes.repoNotFound,
      message: 'Repository not found',
    })
  return { userId, repo }
}

const repoCustomization = {
  args: { repoId: v.id('repos') },
  input: async (
    ctx: QueryCtx | MutationCtx | ActionCtx,
    { repoId }: { repoId: Id<'repos'> },
  ) => ({
    ctx: await requireRepoAccess(ctx, repoId),
    args: { repoId },
  }),
}

export const repoQuery = zCustomQuery(query, repoCustomization)
export const repoMutation = zCustomMutation(
  mutationWithTriggers,
  repoCustomization,
)
export const repoAction = zCustomAction(action, repoCustomization)
