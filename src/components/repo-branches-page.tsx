import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { BranchCard } from '#/components/branch-card'
import { InfiniteScrollTrigger } from '#/components/infinite-scroll-trigger'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Skeleton } from '#/components/ui/skeleton'
import { Switch } from '#/components/ui/switch'
import { UploadTracesButton } from '#/components/upload-traces-button'
import {
  BRANCHES_PAGE_SIZE,
  useBranchesDefaultFirst,
  useInitialRepoSync,
} from '#/hooks/use-branches'
import { cn } from '#/lib/utils'
import type { Doc } from '../../convex/_generated/dataModel'

export function RepoBranchesPage({ repo }: { repo: Doc<'repos'> }) {
  const repoId = repo._id
  const [openPullRequestsOnly, setOpenPullRequestsOnly] = useState(true)
  const { results, status, loadMore } = useBranchesDefaultFirst(
    repo,
    openPullRequestsOnly,
  )
  const reload = useInitialRepoSync(repoId)

  return (
    <div className="flex flex-col gap-4">
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
          <Button
            variant="outline"
            disabled={reload.isPending}
            onClick={() => reload.mutate()}
          >
            <RefreshCw className={cn(reload.isPending && 'animate-spin')} />
            Reload
          </Button>
          <UploadTracesButton repoId={repoId} />
        </div>
      </div>
      {reload.isError && (
        <p className="text-sm text-destructive">{reload.error.message}</p>
      )}
      {status === 'LoadingFirstPage' && <Skeleton className="h-40 w-full" />}
      {results.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((branch) => (
              <BranchCard
                key={branch._id}
                branch={branch}
                repo={repo}
                isDefault={branch.name === repo.defaultBranch}
              />
            ))}
          </div>
          <InfiniteScrollTrigger
            canLoadMore={status === 'CanLoadMore'}
            isLoading={status === 'LoadingMore'}
            onLoadMore={() => loadMore(BRANCHES_PAGE_SIZE)}
          />
        </>
      )}
      {status === 'Exhausted' && results.length === 0 && (
        <p className="text-muted-foreground">
          {openPullRequestsOnly
            ? 'No branches with open pull requests.'
            : 'No branches found.'}
        </p>
      )}
    </div>
  )
}
