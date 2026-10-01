import { commitUrl } from '#/lib/git-host'
import { cn } from '#/lib/utils'
import type { Repo } from '#/lib/schemas/repo'

const SHORT_SHA_LENGTH = 7

/** Short SHA linking to the commit on the Git host. */
export function CommitLink({
  repo,
  sha,
  className,
}: {
  repo: Pick<Repo, 'provider' | 'htmlUrl'>
  sha: string
  className?: string
}) {
  return (
    <a
      href={commitUrl(repo, sha)}
      target="_blank"
      rel="noreferrer"
      title={sha}
      className={cn('font-mono hover:underline', className)}
    >
      {sha.slice(0, SHORT_SHA_LENGTH)}
    </a>
  )
}
