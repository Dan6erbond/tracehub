import { LinkRow } from '#/components/row-link'
import { StretchedLink } from '#/components/stretched-link'
import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { gitProviderTypeLabels } from '#/lib/schemas/git-provider'
import type { GitProviderAdmin } from '#/lib/schemas/git-provider'

function YesNo({ value }: { value: boolean }) {
  return (
    <Badge variant={value ? 'default' : 'secondary'}>
      {value ? 'Yes' : 'No'}
    </Badge>
  )
}

export function ProvidersTable({
  providers,
}: {
  providers: Array<GitProviderAdmin>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Host</TableHead>
          <TableHead>Enabled</TableHead>
          <TableHead>Sign-up</TableHead>
          <TableHead>Trusted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {providers.map((provider) => (
          <LinkRow key={provider._id}>
            <TableCell className="font-medium">
              <StretchedLink
                to="/admin/providers/$providerId"
                params={{ providerId: provider._id }}
              >
                {provider.name}
              </StretchedLink>
            </TableCell>
            <TableCell>{gitProviderTypeLabels[provider.type]}</TableCell>
            <TableCell>{new URL(provider.baseUrl).host}</TableCell>
            <TableCell>
              <YesNo value={provider.enabled} />
            </TableCell>
            <TableCell>
              <YesNo value={provider.allowSignUp} />
            </TableCell>
            <TableCell>
              <YesNo value={provider.trustedForLinking} />
            </TableCell>
          </LinkRow>
        ))}
      </TableBody>
    </Table>
  )
}
