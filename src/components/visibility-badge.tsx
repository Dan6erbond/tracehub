import { Globe, Lock } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import type { Repo } from '#/lib/schemas/repo'

export function VisibilityBadge({ repo }: { repo: Pick<Repo, 'private'> }) {
  const Icon = repo.private ? Lock : Globe
  return (
    <Badge variant="outline">
      <Icon />
      {repo.private ? 'Private' : 'Public'}
    </Badge>
  )
}
