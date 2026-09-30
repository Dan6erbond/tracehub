import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { HostBadge } from '#/components/host-badge'
import { Skeleton } from '#/components/ui/skeleton'
import { VisibilityBadge } from '#/components/visibility-badge'
import { useRepo } from '#/hooks/use-repos'
import { createZodParams } from '#/lib/create-zod-params'

export const Route = createFileRoute('/_app/repos/$repoId')({
  params: createZodParams(z.object({ repoId: zid('repos') })),
  component: RepoLayout,
})

function RepoLayout() {
  const { repoId } = Route.useParams()
  const repo = useRepo(repoId)

  if (repo.isPending) return <Skeleton className="h-10 w-64" />
  if (!repo.data)
    return <p className="text-muted-foreground">Repository not found.</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">
            <Link to="/repos/$repoId" params={{ repoId }}>
              {repo.data.fullName}
            </Link>
          </h1>
          <VisibilityBadge repo={repo.data} />
          <HostBadge repo={repo.data} href={repo.data.htmlUrl} />
        </div>
        {repo.data.description && (
          <p className="text-muted-foreground">{repo.data.description}</p>
        )}
      </div>
      <Outlet />
    </div>
  )
}
