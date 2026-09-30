import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChevronLeft } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { CommitLink } from '#/components/commit-link'
import { HostBadge } from '#/components/host-badge'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { Skeleton } from '#/components/ui/skeleton'
import { useRepo } from '#/hooks/use-repos'
import { branchUrl } from '#/lib/git-host'

export const Route = createFileRoute('/_app/repos/$repoId/branches/$')({
  component: BranchPage,
})

function BranchPage() {
  const { repoId, _splat: name = '' } = Route.useParams()
  const repo = useRepo(repoId)
  const branch = useQuery(convexQuery(api.branches.getBranch, { repoId, name }))

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
      {branch.isPending && <Skeleton className="h-10 w-64" />}
      {branch.data === null && (
        <p className="text-muted-foreground">Branch not found.</p>
      )}
      {branch.data && repo.data && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-xl font-semibold break-all">
              {branch.data.name}
            </h2>
            {branch.data.ciStatus && (
              <CiStatusBadge status={branch.data.ciStatus} />
            )}
            <HostBadge
              repo={repo.data}
              href={branchUrl(repo.data, branch.data.name)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            <CommitLink repo={repo.data} sha={branch.data.headSha} /> ·{' '}
            {new Date(branch.data.committedAt).toLocaleString()}
          </p>
          {branch.data.pullRequests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {branch.data.pullRequests.map((pullRequest) => (
                <PullRequestBadge
                  key={pullRequest.number}
                  pullRequest={pullRequest}
                  repoId={repoId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
