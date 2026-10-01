import { Link } from '@tanstack/react-router'
import {
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import type { Id } from '../../convex/_generated/dataModel'
import type { PullRequest } from '#/lib/schemas/pull-request'

function display({
  closedAt,
  mergedAt,
  draft,
}: Partial<Pick<PullRequest, 'closedAt' | 'mergedAt' | 'draft'>>) {
  if (mergedAt !== undefined)
    return { variant: 'secondary', Icon: GitMerge } as const
  if (closedAt !== undefined)
    return { variant: 'destructive', Icon: GitPullRequestClosed } as const
  if (draft) return { variant: 'secondary', Icon: GitPullRequestDraft } as const
  return { variant: 'outline', Icon: GitPullRequest } as const
}

/** Links to the PR page in TraceHub when `repoId` is given, to the Git host when `href` is set. Without the PR's state it shows as open. */
export function PullRequestBadge({
  pullRequest,
  repoId,
  href,
}: {
  pullRequest: Pick<PullRequest, 'number'> &
    Partial<Pick<PullRequest, 'title' | 'closedAt' | 'mergedAt' | 'draft'>>
  repoId?: Id<'repos'>
  href?: string
}) {
  const { variant, Icon } = display(pullRequest)
  const content = (
    <>
      <Icon />#{pullRequest.number}
    </>
  )
  if (href)
    return (
      <Badge asChild variant={variant} title={pullRequest.title}>
        <a href={href} target="_blank" rel="noreferrer">
          {content}
        </a>
      </Badge>
    )
  if (!repoId)
    return (
      <Badge variant={variant} title={pullRequest.title}>
        {content}
      </Badge>
    )
  return (
    <Badge asChild variant={variant} title={pullRequest.title}>
      <Link
        to="/repos/$repoId/pulls/$number"
        params={{ repoId, number: pullRequest.number }}
      >
        {content}
      </Link>
    </Badge>
  )
}
