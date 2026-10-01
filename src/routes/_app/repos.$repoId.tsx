import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { HostBadge } from '#/components/host-badge'
import { PageTitle } from '#/components/page-title'
import { QueryState } from '#/components/query-state'
import { VisibilityBadge } from '#/components/visibility-badge'
import { RepoProvider } from '#/hooks/use-current-repo'
import { useRepo } from '#/hooks/use-repos'
import { createZodParams } from '#/lib/create-zod-params'

export const Route = createFileRoute('/_app/repos/$repoId')({
  params: createZodParams(z.object({ repoId: zid('repos') })),
  component: RepoLayout,
})

function RepoLayout() {
  const { repoId } = Route.useParams()
  const repoQuery = useRepo(repoId)

  return (
    <QueryState query={repoQuery} notFound="Repository not found.">
      {(repo) => (
        <RepoProvider value={repo}>
          <div className="flex flex-1 flex-col gap-4">
            <PageTitle
              title={
                <Link to="/repos/$repoId" params={{ repoId }}>
                  {repo.fullName}
                </Link>
              }
              description={repo.description}
            >
              <VisibilityBadge repo={repo} />
              <HostBadge repo={repo} href={repo.htmlUrl} />
            </PageTitle>
            <Outlet />
          </div>
        </RepoProvider>
      )}
    </QueryState>
  )
}
