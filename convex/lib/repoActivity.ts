import type { Doc } from '../_generated/dataModel'

/** Sort key for "recent activity": the host's last push, falling back to when we first stored the repo. */
export const repoActivityAt = (repo: Doc<'repos'>) =>
  repo.pushedAt ?? repo._creationTime
