import { z } from 'zod'
import { internal } from './_generated/api'
import {
  authedQuery,
  repoQuery,
  zInternalMutation,
  zInternalQuery,
} from './lib/functions'
import {
  reloadLockKey,
  reloadTargetSchema,
} from '../src/lib/schemas/reload-lock'
import type { Doc } from './_generated/dataModel'

// An action can be killed without running its `finally`, so a lock older than this no longer blocks a new reload.
const RELOAD_LOCK_TTL_MS = 10 * 60 * 1000

export const findLock = zInternalQuery({
  args: { target: reloadTargetSchema },
  handler: (ctx, { target }) =>
    ctx.db
      .query('reloadLocks')
      .withIndex('by_key', (q) => q.eq('key', reloadLockKey(target)))
      .first(),
})

/** Takes the lock of a reload target. Returns its token (pass it to `releaseReload`), or null while another reload holds it. */
export const claimReload = zInternalMutation({
  args: { target: reloadTargetSchema },
  handler: async (ctx, { target }): Promise<number | null> => {
    const startedAt = Date.now()
    const lock: Doc<'reloadLocks'> | null = await ctx.runQuery(
      internal.reloadLocks.findLock,
      { target },
    )
    if (lock && startedAt - lock.startedAt < RELOAD_LOCK_TTL_MS) return null
    // Also clears the lock a killed action left behind, so the reactive state does not stay "reloading".
    const releaseId = await ctx.scheduler.runAfter(
      RELOAD_LOCK_TTL_MS,
      internal.reloadLocks.releaseReload,
      { target, startedAt },
    )
    if (lock)
      await ctx.db.patch('reloadLocks', lock._id, { startedAt, releaseId })
    else
      await ctx.db.insert('reloadLocks', {
        key: reloadLockKey(target),
        startedAt,
        releaseId,
      })
    return startedAt
  },
})

/** Releases the lock claimed with this token; a lock another reload has taken over since stays. */
export const releaseReload = zInternalMutation({
  args: { target: reloadTargetSchema, startedAt: z.number() },
  handler: async (ctx, { target, startedAt }) => {
    const lock: Doc<'reloadLocks'> | null = await ctx.runQuery(
      internal.reloadLocks.findLock,
      { target },
    )
    if (lock?.startedAt !== startedAt) return
    // Running as the scheduled release itself, the job is no longer pending.
    const release = await ctx.db.system.get(
      '_scheduled_functions',
      lock.releaseId,
    )
    if (release?.state.kind === 'pending')
      await ctx.scheduler.cancel(lock.releaseId)
    await ctx.db.delete('reloadLocks', lock._id)
  },
})

export const isRepoReloading = repoQuery({
  args: {},
  handler: async (ctx, { repoId }): Promise<boolean> =>
    (await ctx.runQuery(internal.reloadLocks.findLock, {
      target: { kind: 'repo', repoId },
    })) !== null,
})

export const isUserReloading = authedQuery({
  args: {},
  handler: async (ctx): Promise<boolean> =>
    (await ctx.runQuery(internal.reloadLocks.findLock, {
      target: { kind: 'user', userId: ctx.userId },
    })) !== null,
})
