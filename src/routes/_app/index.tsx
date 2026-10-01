import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ErrorAlert } from '#/components/error-alert'
import { PageTitle } from '#/components/page-title'
import { PaginatedList } from '#/components/paginated-list'
import { ReloadButton } from '#/components/reload-button'
import { RepoList } from '#/components/repo-list'
import { SearchInput } from '#/components/search-input'
import { REPOS_PAGE_SIZE, useReloadRepos, useRepos } from '#/hooks/use-repos'

export const Route = createFileRoute('/_app/')({
  component: Home,
})

function Home() {
  const [search, setSearch] = useState('')
  const repos = useRepos(search)
  const reload = useReloadRepos()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <PageTitle
          title="Repositories"
          description="Repos you can access on your connected Git hosts."
        />
        <ReloadButton reload={reload} />
      </div>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search repositories"
        className="max-w-sm"
      />
      <ErrorAlert error={reload.error} />
      <PaginatedList
        query={repos}
        pageSize={REPOS_PAGE_SIZE}
        skeletonClassName="h-40 w-full"
        empty={
          <p className="text-muted-foreground">
            {search.trim()
              ? 'No repositories match your search.'
              : 'No repositories found.'}
          </p>
        }
      >
        {(results) => <RepoList repos={results} />}
      </PaginatedList>
    </div>
  )
}
