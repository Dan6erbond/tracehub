import { createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { PipelinePage } from '#/components/pipeline-page'
import { useRepo } from '#/hooks/use-repos'
import { createZodParams } from '#/lib/create-zod-params'

export const Route = createFileRoute(
  '/_app/repos/$repoId/pipelines/$pipelineId',
)({
  params: createZodParams(z.object({ pipelineId: zid('ciPipelines') })),
  component: Pipeline,
})

function Pipeline() {
  const { repoId, pipelineId } = Route.useParams()
  const repo = useRepo(repoId)
  return repo.data ? (
    <PipelinePage repo={repo.data} pipelineId={pipelineId} />
  ) : null
}
