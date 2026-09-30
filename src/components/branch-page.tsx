import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChevronLeft } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { CiJobList } from '#/components/ci-job-list'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { CommitLink } from '#/components/commit-link'
import { HostBadge } from '#/components/host-badge'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { RunList } from '#/components/run-list'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import { Skeleton } from '#/components/ui/skeleton'
import { UploadTracesButton } from '#/components/upload-traces-button'
import { useScopeCounts } from '#/hooks/use-runs'
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
  const counts = useScopeCounts(repoId, { kind: 'branch', branch: name })

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
      {branch.data && <CiJobList repoId={repoId} sha={branch.data.headSha} />}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">Trace runs</h3>
        <UploadTracesButton repoId={repoId} target={{ branch: name }} />
      </div>
      {counts.data && <TraceCountsBadges counts={counts.data} />}
      <RunList repo={repo} scope={{ kind: 'branch', branch: name }} />
    </div>
  )
}
