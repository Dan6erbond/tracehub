import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChevronLeft, MoveRight } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { BranchBadge } from '#/components/branch-badge'
import { CiJobList } from '#/components/ci-job-list'
import { CommitLink } from '#/components/commit-link'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { RunList } from '#/components/run-list'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import { Skeleton } from '#/components/ui/skeleton'
import { UploadTracesButton } from '#/components/upload-traces-button'
import { useScopeCounts } from '#/hooks/use-runs'
import type { Doc } from '../../convex/_generated/dataModel'

export function PullRequestPage({
  repo,
  number,
}: {
  repo: Doc<'repos'>
  number: number
}) {
  const repoId = repo._id
  const pullRequest = useQuery(
    convexQuery(api.pullRequests.getPullRequest, { repoId, number }),
  )
  const counts = useScopeCounts(repoId, { kind: 'pull', number })

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/repos/$repoId"
        params={{ repoId }}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Branches
      </Link>
      {pullRequest.isPending && <Skeleton className="h-10 w-64" />}
      {pullRequest.data === null && (
        <p className="text-muted-foreground">Pull request not found.</p>
      )}
      {pullRequest.data && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PullRequestBadge pullRequest={pullRequest.data} external />
            <h2 className="text-xl font-semibold">{pullRequest.data.title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {pullRequest.data.author && <span>{pullRequest.data.author}</span>}
            {pullRequest.data.fromFork ? (
              <span className="font-mono break-all">
                {pullRequest.data.headBranch}
              </span>
            ) : (
              <BranchBadge repoId={repoId} name={pullRequest.data.headBranch} />
            )}
            <MoveRight className="size-4" />
            <BranchBadge repoId={repoId} name={pullRequest.data.baseBranch} />
            <CommitLink repo={repo} sha={pullRequest.data.headSha} />
          </div>
        </div>
      )}
      {pullRequest.data && (
        <CiJobList repoId={repoId} sha={pullRequest.data.headSha} />
      )}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">Trace runs</h3>
        <UploadTracesButton repoId={repoId} target={{ pull: number }} />
      </div>
      {counts.data && <TraceCountsBadges counts={counts.data} />}
      <RunList repo={repo} scope={{ kind: 'pull', number }} />
    </div>
  )
}
