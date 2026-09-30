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

function display({ state, draft }: Pick<PullRequest, 'state' | 'draft'>) {
  if (state === 'merged')
    return { variant: 'secondary', Icon: GitMerge } as const
  if (state === 'closed')
    return { variant: 'destructive', Icon: GitPullRequestClosed } as const
  if (draft) return { variant: 'secondary', Icon: GitPullRequestDraft } as const
  return { variant: 'outline', Icon: GitPullRequest } as const
}

/** Links to the PR page in TraceHub when `repoId` is given, to the Git host when `external` is set. */
export function PullRequestBadge({
  pullRequest,
  repoId,
  external,
}: {
  pullRequest: Pick<PullRequest, 'number' | 'title' | 'state' | 'draft'> &
    Partial<Pick<PullRequest, 'htmlUrl'>>
  repoId?: Id<'repos'>
  external?: boolean
}) {
  const { variant, Icon } = display(pullRequest)
  const content = (
    <>
      <Icon />#{pullRequest.number}
    </>
  )
  if (external && pullRequest.htmlUrl)
    return (
      <Badge asChild variant={variant} title={pullRequest.title}>
        <a href={pullRequest.htmlUrl} target="_blank" rel="noreferrer">
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
    <Badge
      asChild
      variant={variant}
      title={pullRequest.title}
      className="relative z-10"
    >
      <Link
        to="/repos/$repoId/pulls/$number"
        params={{ repoId, number: pullRequest.number }}
      >
        {content}
      </Link>
    </Badge>
  )
}
