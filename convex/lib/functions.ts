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
import { components, internal } from '../_generated/api'
import { authComponent } from '../auth'
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from '../_generated/server'
import { loadProviderConfig } from './gitProviders/providerConfig'
import { triggers } from './triggers'
import { errorCodes } from '../../src/lib/errors'
import { isAdminRole } from '../../src/lib/roles'
import type { Doc, Id } from '../_generated/dataModel'
import type { ActionCtx, MutationCtx, QueryCtx } from '../_generated/server'
import type { RepoHost } from './gitProviders/types'

const withTriggers = customCtx((ctx: MutationCtx) => ({
  db: triggers.wrapDB(ctx).db,
}))
const mutationWithTriggers = customMutation(mutation, withTriggers)

export const zQuery = zCustomQuery(query, NoOp)
export const zInternalQuery = zCustomQuery(internalQuery, NoOp)
export const zInternalMutation = zCustomMutation(
  customMutation(internalMutation, withTriggers),
  NoOp,
)

const unauthenticated = () =>
  new ConvexError({
    code: errorCodes.unauthenticated,
    message: 'Unauthenticated',
  })

/**
 * The token alone stays valid until it expires (15 minutes), so a ban or removal would linger; the session it was issued for must still exist.
 * One read by document id, and a revoked session invalidates live queries.
 */
const requireUserId = async (ctx: QueryCtx | ActionCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw unauthenticated()
  const session = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'session',
    where: [
      { field: '_id', value: identity.sessionId as string },
      { field: 'expiresAt', operator: 'gt', value: Date.now() },
    ],
  })
  if (!session) throw unauthenticated()
  return { userId: identity.subject }
}

export const authedQuery = zCustomQuery(query, customCtx(requireUserId))
export const authedAction = zCustomAction(action, customCtx(requireUserId))

export const viewerIsAdmin = async (
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<boolean> =>
  isAdminRole((await authComponent.safeGetAuthUser(ctx))?.role)

/** Adds `userId` like the authed builders, but only for admins; the role is read from Better Auth on every call, not from the token. */
const requireAdmin = async (ctx: QueryCtx | MutationCtx | ActionCtx) => {
  const { userId } = await requireUserId(ctx)
  if (!(await viewerIsAdmin(ctx)))
    throw new ConvexError({
      code: errorCodes.forbidden,
      message: 'Admin access required',
    })
  return { userId }
}

export const adminQuery = zCustomQuery(query, customCtx(requireAdmin))
export const adminMutation = zCustomMutation(
  mutationWithTriggers,
  customCtx(requireAdmin),
)
export const adminAction = zCustomAction(action, customCtx(requireAdmin))

/** Adds `userId`, the repo (`ctx.repo`) the user can access and its provider (`ctx.provider`), else throws; access is whatever `getUserRepo` decides. */
const requireRepoAccess = async (
  ctx: QueryCtx | MutationCtx | ActionCtx,
  repoId: Id<'repos'>,
): Promise<{ userId: string } & RepoHost> => {
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
  const provider = await loadProviderConfig(ctx, repo.providerId)
  // A disabled provider can no longer reach its host, so its repos are treated as gone rather than half working.
  if (!provider?.enabled)
    throw new ConvexError({
      code: errorCodes.repoNotFound,
      message: 'Repository not found',
    })
  return { userId, repo, provider }
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
