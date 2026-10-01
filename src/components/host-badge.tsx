import { ExternalLink } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { hostLabel } from '#/lib/git-host'
import type { Repo } from '#/lib/schemas/repo'

/** The Git host's name, as an external link to a page on the host when `href` is given. */
export function HostBadge({
  repo,
  href,
}: {
  repo: Pick<Repo, 'provider' | 'htmlUrl'>
  href?: string
}) {
  if (!href) return <Badge variant="secondary">{hostLabel(repo)}</Badge>
  return (
    <Badge asChild variant="outline">
      <a href={href} target="_blank" rel="noreferrer">
        {hostLabel(repo)}
        <ExternalLink />
      </a>
    </Badge>
  )
}
