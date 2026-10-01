import { BackLink } from '#/components/back-link'
import { CiStatusBadge } from '#/components/ci-status-badge'
import { CommitTimestamp } from '#/components/commit-timestamp'
import { HostBadge } from '#/components/host-badge'
import { PageHeader } from '#/components/page-header'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { ScopeActivity } from '#/components/scope-activity'
import { useBranch } from '#/hooks/use-branches'
import type { RepoView } from '#/lib/schemas/host-links'

export function BranchPage({ repo, name }: { repo: RepoView; name: string }) {
  const repoId = repo._id
  const branch = useBranch(repoId, name)

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/repos/$repoId" params={{ repoId }}>
        Branches
      </BackLink>
      <PageHeader
        title={<span className="font-mono break-all">{branch.name}</span>}
        badges={
          <>
            {branch.ciStatus && <CiStatusBadge status={branch.ciStatus} />}
            <HostBadge repo={repo} href={branch.url} />
          </>
        }
        meta={
          <CommitTimestamp
            sha={branch.headSha}
            commitUrl={branch.commitUrl}
            timestamp={branch.committedAt}
          />
        }
      >
        {branch.pullRequests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {branch.pullRequests.map((pullRequest) => (
              <PullRequestBadge
                key={pullRequest.number}
                pullRequest={pullRequest}
                repoId={repoId}
              />
            ))}
          </div>
        )}
      </PageHeader>
      <ScopeActivity
        repoId={repoId}
        scope={{ kind: 'branch', branch: name }}
        headSha={branch.headSha}
        uploadTarget={{ branch: name }}
      />
    </div>
  )
}
