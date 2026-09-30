import { createFileRoute } from '@tanstack/react-router'
import { RepoBranchesPage } from '#/components/repo-branches-page'
import { useRepo } from '#/hooks/use-repos'

export const Route = createFileRoute('/_app/repos/$repoId/')({
  component: RepoBranches,
})

function RepoBranches() {
  const repo = useRepo(Route.useParams().repoId)
  return repo.data ? <RepoBranchesPage repo={repo.data} /> : null
}
