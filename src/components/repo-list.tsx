import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type { Repo } from '#/lib/schemas/repo'

export function RepoList({ repos }: { repos: Array<Repo> }) {
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
          <TableRow key={`${repo.provider}:${repo.externalId}`}>
            <TableCell className="whitespace-normal">
              <div className="font-medium">{repo.fullName}</div>
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
              <Badge variant="outline">
                {repo.private ? 'Private' : 'Public'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
