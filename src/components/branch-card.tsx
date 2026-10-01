import { CiStatusBadge } from '#/components/ci-status-badge'
import { LinkCard } from '#/components/card-link'
import { CommitTimestamp } from '#/components/commit-timestamp'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { StretchedLink } from '#/components/stretched-link'
import { Badge } from '#/components/ui/badge'
import {
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import type { BranchWithDetails } from '../../convex/branches'

export function BranchCard({
  branch,
  isDefault,
}: {
  branch: BranchWithDetails
  isDefault: boolean
}) {
  return (
    <LinkCard>
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2 font-mono text-sm">
          <StretchedLink
            to="/repos/$repoId/branches/$"
            params={{ repoId: branch.repoId, _splat: branch.name }}
            title={branch.name}
            className="min-w-0 truncate"
          >
            {branch.name}
          </StretchedLink>
          {isDefault && <Badge variant="secondary">default</Badge>}
          {branch.remoteDeletedAt !== undefined && (
            <Badge variant="outline">deleted on remote</Badge>
          )}
        </CardTitle>
        <CardDescription>
          <CommitTimestamp
            sha={branch.headSha}
            commitUrl={branch.commitUrl}
            timestamp={branch.committedAt}
            dateOnly
          />
        </CardDescription>
        {branch.ciStatus && (
          <CardAction>
            <CiStatusBadge status={branch.ciStatus} />
          </CardAction>
        )}
      </CardHeader>
      {branch.pullRequests.length > 0 && (
        <CardContent className="flex flex-wrap gap-2">
          {branch.pullRequests.map((pullRequest) => (
            <PullRequestBadge
              key={pullRequest.number}
              pullRequest={pullRequest}
              repoId={branch.repoId}
            />
          ))}
        </CardContent>
      )}
    </LinkCard>
  )
}
