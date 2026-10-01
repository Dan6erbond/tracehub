import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod4'

export const reloadLockSchema = z.object({
  key: z.string(),
  startedAt: z.number(),
  // The scheduled release that frees the lock should its action be killed.
  releaseId: zid('_scheduled_functions'),
})

/** What a reload refreshes: one repo's branches and CI, or the repo list of one user. */
export const reloadTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('repo'), repoId: zid('repos') }),
  z.object({ kind: z.literal('user'), userId: z.string() }),
])
export type ReloadTarget = z.infer<typeof reloadTargetSchema>

export const reloadLockKey = (target: ReloadTarget) =>
  target.kind === 'repo' ? `repo:${target.repoId}` : `user:${target.userId}`
