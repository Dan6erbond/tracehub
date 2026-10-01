import { internal } from '../_generated/api'
import type { ActionCtx } from '../_generated/server'
import type { ReloadTarget } from '../../src/lib/schemas/reload-lock'

/** Runs `reload` unless another reload of the same target is running; `reloaded: false` then means "already running". */
export const withReloadLock = async (
  ctx: ActionCtx,
  target: ReloadTarget,
  reload: () => Promise<void>,
): Promise<{ reloaded: boolean }> => {
  const startedAt: number | null = await ctx.runMutation(
    internal.reloadLocks.claimReload,
    { target },
  )
  if (startedAt === null) return { reloaded: false }
  try {
    await reload()
    return { reloaded: true }
  } finally {
    // A failing release must not replace the reload's own error; the scheduled release frees the lock later.
    await ctx
      .runMutation(internal.reloadLocks.releaseReload, { target, startedAt })
      .catch((error: unknown) => {
        console.error('Releasing the reload lock failed', error)
      })
  }
}
