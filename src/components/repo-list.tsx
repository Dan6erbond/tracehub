import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { VisibilityBadge } from '#/components/visibility-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type { Doc } from '../../convex/_generated/dataModel'

export function RepoList({ repos }: { repos: Array<Doc<'repos'>> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Repository</TableHead>
          <TableHead>Host</TableHead>
          <TableHead>Visibility</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {repos.map((repo) => (
          <TableRow key={repo._id} className="relative">
            <TableCell className="whitespace-normal">
              <Link
                to="/repos/$repoId"
                params={{ repoId: repo._id }}
                className="font-medium after:absolute after:inset-0"
              >
                {repo.fullName}
              </Link>
              {repo.description && (
                <div className="text-sm text-muted-foreground">
                  {repo.description}
                </div>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="capitalize">
                {repo.provider}
              </Badge>
            </TableCell>
            <TableCell>
              <VisibilityBadge repo={repo} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
