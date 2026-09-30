import { ExternalLink } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { hostLabel } from '#/lib/git-host'
import type { Repo } from '#/lib/schemas/repo'

/** External link to a page on the Git host, labelled with the host's name. */
export function HostBadge({
  repo,
  href,
}: {
  repo: Pick<Repo, 'provider' | 'htmlUrl'>
  href: string
}) {
  return (
    <Badge asChild variant="outline">
      <a href={href} target="_blank" rel="noreferrer">
        {hostLabel(repo)}
        <ExternalLink />
      </a>
    </Badge>
  )
}
