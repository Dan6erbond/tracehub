import { Link } from '@tanstack/react-router'
import {
  Book,
  ChevronRight,
  FlaskConical,
  Loader2,
  Lock,
  MoreHorizontal,
} from 'lucide-react'
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
import { NavUser } from '#/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar'

export function AppSidebar() {
  useInitialRepoScan()
  const { results, status, loadMore } = useRepos()
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <FlaskConical className="size-4" />
                </div>
                <span className="text-base font-semibold">TraceHub</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
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
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
