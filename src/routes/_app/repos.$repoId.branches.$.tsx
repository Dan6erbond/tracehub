import { createFileRoute } from '@tanstack/react-router'
import { BranchPage } from '#/components/branch-page'
import { useCurrentRepo } from '#/hooks/use-current-repo'

export const Route = createFileRoute('/_app/repos/$repoId/branches/$')({
  component: Branch,
})

function Branch() {
  const { _splat: name = '' } = Route.useParams()
  return <BranchPage repo={useCurrentRepo()} name={name} />
}
