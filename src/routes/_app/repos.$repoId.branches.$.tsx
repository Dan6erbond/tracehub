import { createFileRoute } from '@tanstack/react-router'
import { BranchPage } from '#/components/branch-page'
import { NotFound } from '#/components/not-found'
import { branchQueryOptions } from '#/hooks/use-branches'
import { useCurrentRepo } from '#/hooks/use-current-repo'
import { ensureEntity } from '#/lib/ensure-entity'

export const Route = createFileRoute('/_app/repos/$repoId/branches/$')({
  loader: async ({
    context: { queryClient },
    params: { repoId, _splat = '' },
  }) => {
    await ensureEntity(queryClient, branchQueryOptions(repoId, _splat))
  },
  notFoundComponent: () => <NotFound entity="Branch" />,
  component: Branch,
})

function Branch() {
  const { _splat: name = '' } = Route.useParams()
  return <BranchPage repo={useCurrentRepo()} name={name} />
}
