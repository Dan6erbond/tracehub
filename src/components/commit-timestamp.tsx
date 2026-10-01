import { CommitLink } from '#/components/commit-link'
import { formatDate, formatDateTime } from '#/lib/format'
import type { Repo } from '#/lib/schemas/repo'

/** A commit followed by when it happened. */
export function CommitTimestamp({
  repo,
  sha,
  timestamp,
  dateOnly,
}: {
  repo: Pick<Repo, 'provider' | 'htmlUrl'>
  sha: string
  timestamp?: number
  dateOnly?: boolean
}) {
  return (
    <span>
      <CommitLink repo={repo} sha={sha} />
      {timestamp !== undefined &&
        ` · ${(dateOnly ? formatDate : formatDateTime)(timestamp)}`}
    </span>
  )
}
