import { useState } from 'react'
import { BranchCard } from '#/components/branch-card'
import { ErrorAlert } from '#/components/error-alert'
import { PaginatedList } from '#/components/paginated-list'
import { ReloadButton } from '#/components/reload-button'
import { RepoTabs } from '#/components/repo-tabs'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { UploadTracesButton } from '#/components/upload-traces-button'
import {
  BRANCHES_PAGE_SIZE,
  useBranchesDefaultFirst,
  useInitialRepoSync,
} from '#/hooks/use-branches'
import type { RepoView } from '#/lib/schemas/host-links'

export function RepoBranchesPage({ repo }: { repo: RepoView }) {
  const repoId = repo._id
  const [openPullRequestsOnly, setOpenPullRequestsOnly] = useState(true)
  const branches = useBranchesDefaultFirst(repo, openPullRequestsOnly)
  const reload = useInitialRepoSync(repoId)

  return (
    <div className="flex flex-col gap-4">
      <RepoTabs repoId={repoId} active="branches" />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="open-pull-requests-only"
            checked={openPullRequestsOnly}
            onCheckedChange={setOpenPullRequestsOnly}
          />
          <Label htmlFor="open-pull-requests-only">
            Only branches with open pull requests
          </Label>
        </div>
        <div className="flex gap-2">
          <ReloadButton reload={reload} />
          <UploadTracesButton repoId={repoId} />
        </div>
      </div>
      <ErrorAlert error={reload.error} />
      <PaginatedList
        query={branches}
        pageSize={BRANCHES_PAGE_SIZE}
        skeletonClassName="h-40 w-full"
        empty={
          <p className="text-muted-foreground">
            {openPullRequestsOnly
              ? 'No branches with open pull requests.'
              : 'No branches found.'}
          </p>
        }
      >
        {(results) => (
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((branch) => (
              <BranchCard
                key={branch._id}
                branch={branch}
                isDefault={branch.name === repo.defaultBranch}
              />
            ))}
          </div>
        )}
      </PaginatedList>
    </div>
  )
}
