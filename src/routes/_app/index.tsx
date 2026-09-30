import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { InfiniteScrollTrigger } from '#/components/infinite-scroll-trigger'
import { RepoList } from '#/components/repo-list'
import { SearchInput } from '#/components/search-input'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { REPOS_PAGE_SIZE, useReloadRepos, useRepos } from '#/hooks/use-repos'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/')({
  component: Home,
})

function Home() {
  const [search, setSearch] = useState('')
  const { results, status, loadMore } = useRepos(search)
  const reload = useReloadRepos()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Repositories</h1>
          <p className="text-muted-foreground">
            Repos you can access on your connected Git hosts.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={reload.isPending}
          onClick={() => reload.mutate()}
        >
          <RefreshCw className={cn(reload.isPending && 'animate-spin')} />
          Reload
        </Button>
      </div>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search repositories"
        className="max-w-sm"
      />
      {status === 'LoadingFirstPage' && <Skeleton className="h-40 w-full" />}
      {reload.isError && (
        <p className="text-sm text-destructive">{reload.error.message}</p>
      )}
      {results.length > 0 && (
        <>
          <RepoList repos={results} />
          <InfiniteScrollTrigger
            canLoadMore={status === 'CanLoadMore'}
            isLoading={status === 'LoadingMore'}
            onLoadMore={() => loadMore(REPOS_PAGE_SIZE)}
          />
        </>
      )}
      {status === 'Exhausted' && results.length === 0 && (
        <p className="text-muted-foreground">
          {search.trim()
            ? 'No repositories match your search.'
            : 'No repositories found.'}
        </p>
      )}
    </div>
  )
}
