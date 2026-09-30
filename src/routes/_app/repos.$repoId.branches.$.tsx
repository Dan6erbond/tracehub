import { createFileRoute } from '@tanstack/react-router'
import { BranchPage } from '#/components/branch-page'
import { useRepo } from '#/hooks/use-repos'

export const Route = createFileRoute('/_app/repos/$repoId/branches/$')({
  component: Branch,
})

function Branch() {
  const { repoId, _splat: name = '' } = Route.useParams()
  const repo = useRepo(repoId)
  return repo.data ? <BranchPage repo={repo.data} name={name} /> : null
}
