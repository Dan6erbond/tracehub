import { ConvexError } from 'convex/values'
import { NoOp, customCtx } from 'convex-helpers/server/customFunctions'
import {
  zCustomAction,
  zCustomMutation,
  zCustomQuery,
} from 'convex-helpers/server/zod4'
import { action, internalMutation, mutation, query } from '../_generated/server'
import { triggers } from './triggers'
import type { ActionCtx, QueryCtx } from '../_generated/server'

export const zQuery = zCustomQuery(query, NoOp)
export const zMutation = zCustomMutation(mutation, customCtx(triggers.wrapDB))
export const zInternalMutation = zCustomMutation(
  internalMutation,
  customCtx(triggers.wrapDB),
)

const requireUserId = async (ctx: QueryCtx | ActionCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError('Unauthenticated')
  return { userId: identity.subject }
}

export const authedQuery = zCustomQuery(query, customCtx(requireUserId))
export const authedAction = zCustomAction(action, customCtx(requireUserId))
