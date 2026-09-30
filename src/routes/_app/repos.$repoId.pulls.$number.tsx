import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChevronLeft, MoveRight } from 'lucide-react'
import { z } from 'zod'
import { api } from '../../../convex/_generated/api'
import { BranchBadge } from '#/components/branch-badge'
import { CommitLink } from '#/components/commit-link'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { Skeleton } from '#/components/ui/skeleton'
import { useRepo } from '#/hooks/use-repos'
import { createZodParams } from '#/lib/create-zod-params'

export const Route = createFileRoute('/_app/repos/$repoId/pulls/$number')({
  params: createZodParams(z.object({ number: z.coerce.number().int() })),
  component: PullRequestPage,
})

function PullRequestPage() {
  const { repoId, number } = Route.useParams()
  const repo = useRepo(repoId)
  const pullRequest = useQuery(
    convexQuery(api.pullRequests.getPullRequest, { repoId, number }),
  )

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
      {pullRequest.data && repo.data && (
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
            <CommitLink repo={repo.data} sha={pullRequest.data.headSha} />
          </div>
        </div>
      )}
    </div>
  )
}
