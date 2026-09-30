import { createFileRoute } from '@tanstack/react-router'
import { RepoPipelinesPage } from '#/components/repo-pipelines-page'
import { useRepo } from '#/hooks/use-repos'

export const Route = createFileRoute('/_app/repos/$repoId/pipelines/')({
  component: RepoPipelines,
})

function RepoPipelines() {
  const repo = useRepo(Route.useParams().repoId)
  return repo.data ? <RepoPipelinesPage repo={repo.data} /> : null
}
