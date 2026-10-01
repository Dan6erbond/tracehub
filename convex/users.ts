import { z } from 'zod'
import { asyncMap } from 'convex-helpers'
import { components, internal } from './_generated/api'
import type { authComponent } from './auth'
import {
  adminQuery,
  authedQuery,
  viewerIsAdmin,
  zInternalMutation,
} from './lib/functions'
import { paginationOptsSchema } from '../src/lib/schemas/pagination'
import type { PaginationResult } from 'convex/server'
import type { Doc } from './_generated/dataModel'
import type { AdminUser } from '../src/lib/schemas/admin-user'

const USER_DATA_BATCH_SIZE = 100

type AuthUser = NonNullable<
  Awaited<ReturnType<typeof authComponent.getAnyUserById>>
>

const toAdminUser = (user: AuthUser): AdminUser => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role ?? undefined,
  banned: user.banned ?? undefined,
  createdAt: user.createdAt,
})

export const isAdmin = authedQuery({
  args: {},
  handler: (ctx): Promise<boolean> => viewerIsAdmin(ctx),
})

/**
 * One page of users, oldest first, or those whose email starts with `search`, in email order.
 * Both read an index of the Better Auth component through its adapter query, so a page costs a page, never the table.
 */
export const listUsers = adminQuery({
  args: { search: z.string().optional(), paginationOpts: paginationOptsSchema },
  handler: async (
    ctx,
    { search, paginationOpts },
  ): Promise<PaginationResult<AdminUser>> => {
    // Emails are stored lowercase; a prefix is the range from itself up to itself plus the highest character.
    const prefix = search?.trim().toLowerCase()
    const result: PaginationResult<AuthUser> = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: 'user',
        paginationOpts,
        ...(prefix
          ? {
              where: [
                { field: 'email', operator: 'gte', value: prefix },
                { field: 'email', operator: 'lt', value: `${prefix}￿` },
              ],
            }
          : { sortBy: { field: 'createdAt', direction: 'asc' } }),
      },
    )
    return { ...result, page: result.page.map(toAdminUser) }
  },
})

/**
 * Deletes what a removed Better Auth user leaves in app tables: their repo links and reload lock.
 * Batched, rescheduling itself while links remain. Runs and branches keep their `createdBy`, which is attribution rather than ownership.
 */
export const removeUserData = zInternalMutation({
  args: { userId: z.string() },
  handler: async (ctx, { userId }) => {
    const links = await ctx.db
      .query('userRepos')
      .withIndex('by_user_activityAt', (q) => q.eq('userId', userId))
      .take(USER_DATA_BATCH_SIZE)
    await asyncMap(links, (link) => ctx.db.delete('userRepos', link._id))
    if (links.length === USER_DATA_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.users.removeUserData, { userId })
      return
    }
    const target = { kind: 'user', userId } as const
    const lock: Doc<'reloadLocks'> | null = await ctx.runQuery(
      internal.reloadLocks.findLock,
      { target },
    )
    if (lock)
      await ctx.runMutation(internal.reloadLocks.releaseReload, {
        target,
        startedAt: lock.startedAt,
      })
  },
})
