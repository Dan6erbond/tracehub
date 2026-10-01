import { createFileRoute } from '@tanstack/react-router'
import { RepoPipelinesPage } from '#/components/repo-pipelines-page'
import { useCurrentRepo } from '#/hooks/use-current-repo'

export const Route = createFileRoute('/_app/repos/$repoId/pipelines/')({
  component: RepoPipelines,
})

function RepoPipelines() {
  return <RepoPipelinesPage repo={useCurrentRepo()} />
}
