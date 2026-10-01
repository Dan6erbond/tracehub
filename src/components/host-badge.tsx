import { ExternalLink } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import type { RepoView } from '#/lib/schemas/host-links'

/** The Git host's name, as an external link to a page on the host when `href` is given. */
export function HostBadge({
  repo,
  href,
}: {
  repo: Pick<RepoView, 'providerLabel'>
  href?: string
}) {
  if (!href) return <Badge variant="secondary">{repo.providerLabel}</Badge>
  return (
    <Badge asChild variant="outline">
      <a href={href} target="_blank" rel="noreferrer">
        {repo.providerLabel}
        <ExternalLink />
      </a>
    </Badge>
  )
}
