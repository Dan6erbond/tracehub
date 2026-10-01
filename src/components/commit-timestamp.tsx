import { CommitLink } from '#/components/commit-link'
import { formatDate, formatDateTime } from '#/lib/format'

/** A commit followed by when it happened. */
export function CommitTimestamp({
  sha,
  commitUrl,
  timestamp,
  dateOnly,
}: {
  sha: string
  commitUrl: string
  timestamp?: number
  dateOnly?: boolean
}) {
  return (
    <span>
      <CommitLink sha={sha} commitUrl={commitUrl} />
      {timestamp !== undefined &&
        ` · ${(dateOnly ? formatDate : formatDateTime)(timestamp)}`}
    </span>
  )
}
