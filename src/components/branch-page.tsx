import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChevronLeft } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { CommitLink } from '#/components/commit-link'
import { HostBadge } from '#/components/host-badge'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { ScopeActivity } from '#/components/scope-activity'
import { Skeleton } from '#/components/ui/skeleton'
import { branchUrl } from '#/lib/git-host'
import type { Doc } from '../../convex/_generated/dataModel'

export function BranchPage({
  repo,
  name,
}: {
  repo: Doc<'repos'>
  name: string
}) {
  const repoId = repo._id
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
      {branch.data && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-xl font-semibold break-all">
              {branch.data.name}
            </h2>
            {branch.data.ciStatus && (
              <CiStatusBadge status={branch.data.ciStatus} />
            )}
            <HostBadge repo={repo} href={branchUrl(repo, branch.data.name)} />
          </div>
          <p className="text-sm text-muted-foreground">
            <CommitLink repo={repo} sha={branch.data.headSha} /> ·{' '}
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
      {branch.data && (
        <ScopeActivity
          repo={repo}
          scope={{ kind: 'branch', branch: name }}
          headSha={branch.data.headSha}
          uploadTarget={{ branch: name }}
        />
      )}
    </div>
  )
}
