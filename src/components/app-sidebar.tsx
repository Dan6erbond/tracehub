import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Book, ChevronRight, Loader2, Lock, MoreHorizontal } from 'lucide-react'
import {
  REPOS_PAGE_SIZE,
  useInitialRepoScan,
  useRepos,
} from '#/hooks/use-repos'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { SearchInput } from '#/components/search-input'
import { SidebarFrame } from '#/components/sidebar-frame'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar'

export function AppSidebar() {
  useInitialRepoScan()
  const [search, setSearch] = useState('')
  const { results, status, loadMore } = useRepos(search)
  return (
    <SidebarFrame>
      <Collapsible defaultOpen className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger>
              Repositories
              <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search repositories"
                className="mb-2 px-2"
              />
              <SidebarMenu>
                {results.map((repo) => (
                  <SidebarMenuItem key={repo._id}>
                    <SidebarMenuButton asChild tooltip={repo.fullName}>
                      <Link
                        to="/repos/$repoId"
                        params={{ repoId: repo._id }}
                        activeProps={{ 'data-active': true }}
                      >
                        {repo.private ? <Lock /> : <Book />}
                        <span>{repo.fullName}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {status === 'Exhausted' && results.length === 0 && search && (
                  <p className="px-2 text-sm text-muted-foreground">
                    No matches.
                  </p>
                )}
                {(status === 'CanLoadMore' || status === 'LoadingMore') && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      disabled={status === 'LoadingMore'}
                      onClick={() => loadMore(REPOS_PAGE_SIZE)}
                    >
                      {status === 'LoadingMore' ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <MoreHorizontal />
                      )}
                      <span>Load more</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    </SidebarFrame>
  )
}
