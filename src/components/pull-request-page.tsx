import { MoveRight } from 'lucide-react'
import { BackLink } from '#/components/back-link'
import { BranchBadge } from '#/components/branch-badge'
import { CommitLink } from '#/components/commit-link'
import { PageHeader } from '#/components/page-header'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { ScopeActivity } from '#/components/scope-activity'
import { usePullRequest } from '#/hooks/use-pull-requests'
import { pullUrl } from '#/lib/git-host'
import type { Doc } from '../../convex/_generated/dataModel'

export function PullRequestPage({
  repo,
  number,
}: {
  repo: Doc<'repos'>
  number: number
}) {
  const repoId = repo._id
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
              href={pullUrl(repo, number)}
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
            <CommitLink repo={repo} sha={pullRequest.headSha} />
          </>
        }
      />
      <ScopeActivity
        repo={repo}
        scope={{ kind: 'pull', number }}
        headSha={pullRequest.headSha}
        uploadTarget={{ pull: number }}
      />
    </div>
  )
}
