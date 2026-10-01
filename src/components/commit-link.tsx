import { cn } from '#/lib/utils'

const SHORT_SHA_LENGTH = 7

/** Short SHA linking to the commit on the Git host. */
export function CommitLink({
  sha,
  commitUrl,
  className,
}: {
  sha: string
  commitUrl: string
  className?: string
}) {
  return (
    <a
      href={commitUrl}
      target="_blank"
      rel="noreferrer"
      title={sha}
      className={cn('font-mono hover:underline', className)}
    >
      {sha.slice(0, SHORT_SHA_LENGTH)}
    </a>
  )
}
