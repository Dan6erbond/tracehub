import { createFileRoute } from '@tanstack/react-router'
import { RepoBranchesPage } from '#/components/repo-branches-page'
import { useCurrentRepo } from '#/hooks/use-current-repo'

export const Route = createFileRoute('/_app/repos/$repoId/')({
  component: RepoBranches,
})

function RepoBranches() {
  return <RepoBranchesPage repo={useCurrentRepo()} />
}
