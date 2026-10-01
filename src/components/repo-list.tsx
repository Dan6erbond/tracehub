import { LinkRow } from '#/components/row-link'
import { StretchedLink } from '#/components/stretched-link'
import { HostBadge } from '#/components/host-badge'
import { VisibilityBadge } from '#/components/visibility-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type { RepoView } from '#/lib/schemas/host-links'

export function RepoList({ repos }: { repos: Array<RepoView> }) {
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
              <StretchedLink
                to="/repos/$repoId"
                params={{ repoId: repo._id }}
                className="font-medium"
              >
                {repo.fullName}
              </StretchedLink>
              {repo.description && (
                <div className="text-sm text-muted-foreground">
                  {repo.description}
                </div>
              )}
            </TableCell>
            <TableCell>
              <HostBadge repo={repo} />
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
