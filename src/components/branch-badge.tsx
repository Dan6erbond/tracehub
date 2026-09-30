import { Link } from '@tanstack/react-router'
import { GitBranch } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import type { Id } from '../../convex/_generated/dataModel'

/** Links to the branch page in TraceHub. */
export function BranchBadge({
  repoId,
  name,
}: {
  repoId: Id<'repos'>
  name: string
}) {
  return (
    <Badge asChild variant="outline" className="max-w-full font-mono">
      <Link to="/repos/$repoId/branches/$" params={{ repoId, _splat: name }}>
        <GitBranch />
        <span className="truncate">{name}</span>
      </Link>
    </Badge>
  )
}
