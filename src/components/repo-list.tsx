import { LinkRow, RowLink } from '#/components/row-link'
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
          <LinkRow key={repo._id}>
            <TableCell className="whitespace-normal">
              <RowLink
                to="/repos/$repoId"
                params={{ repoId: repo._id }}
                className="font-medium"
              >
                {repo.fullName}
              </RowLink>
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
          </LinkRow>
        ))}
      </TableBody>
    </Table>
  )
}
