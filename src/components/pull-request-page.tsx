import { MoveRight } from 'lucide-react'
import { BackLink } from '#/components/back-link'
import { BranchBadge } from '#/components/branch-badge'
import { CommitLink } from '#/components/commit-link'
import { PageHeader } from '#/components/page-header'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { ScopeActivity } from '#/components/scope-activity'
import { usePullRequest } from '#/hooks/use-pull-requests'
import type { Id } from '../../convex/_generated/dataModel'

export function PullRequestPage({
  repoId,
  number,
}: {
  repoId: Id<'repos'>
  number: number
}) {
  const pullRequest = usePullRequest(repoId, number)

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/repos/$repoId" params={{ repoId }}>
        Branches
      </BackLink>
      <PageHeader
        title={
          <>
            <PullRequestBadge
              pullRequest={pullRequest}
              href={pullRequest.url}
            />
            {pullRequest.title}
          </>
        }
        meta={
          <>
            {pullRequest.author && <span>{pullRequest.author}</span>}
            {pullRequest.fromFork ? (
              <span className="font-mono break-all">
                {pullRequest.headBranch}
              </span>
            ) : (
              <BranchBadge repoId={repoId} name={pullRequest.headBranch} />
            )}
            <MoveRight className="size-4" />
            <BranchBadge repoId={repoId} name={pullRequest.baseBranch} />
            <CommitLink
              sha={pullRequest.headSha}
              commitUrl={pullRequest.commitUrl}
            />
          </>
        }
      />
      <ScopeActivity
        repoId={repoId}
        scope={{ kind: 'pull', number }}
        headSha={pullRequest.headSha}
        uploadTarget={{ pull: number }}
      />
    </div>
  )
}
