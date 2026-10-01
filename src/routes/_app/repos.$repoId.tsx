import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { HostBadge } from '#/components/host-badge'
import { NotFound } from '#/components/not-found'
import { PageTitle } from '#/components/page-title'
import { VisibilityBadge } from '#/components/visibility-badge'
import { RepoProvider } from '#/hooks/use-current-repo'
import { repoQueryOptions, useRepo } from '#/hooks/use-repos'
import { createZodParams } from '#/lib/create-zod-params'
import { ensureEntity } from '#/lib/ensure-entity'

export const Route = createFileRoute('/_app/repos/$repoId')({
  params: createZodParams(z.object({ repoId: zid('repos') })),
  loader: async ({ context: { queryClient }, params: { repoId } }) => {
    await ensureEntity(queryClient, repoQueryOptions(repoId))
  },
  notFoundComponent: () => <NotFound entity="Repository" />,
  component: RepoLayout,
})

function RepoLayout() {
  const { repoId } = Route.useParams()
  const repo = useRepo(repoId)

  return (
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
  )
}
