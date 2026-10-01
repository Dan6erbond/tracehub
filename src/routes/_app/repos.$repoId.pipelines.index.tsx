import { createFileRoute } from '@tanstack/react-router'
import { RepoPipelinesPage } from '#/components/repo-pipelines-page'

export const Route = createFileRoute('/_app/repos/$repoId/pipelines/')({
  component: RepoPipelines,
})

function RepoPipelines() {
  const { repoId } = Route.useParams()
  return <RepoPipelinesPage repoId={repoId} />
}
