import { createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { NotFound } from '#/components/not-found'
import { PipelinePage } from '#/components/pipeline-page'
import { pipelineQueryOptions } from '#/hooks/use-ci-pipelines'
import { createZodParams } from '#/lib/create-zod-params'
import { ensureEntity } from '#/lib/ensure-entity'

export const Route = createFileRoute(
  '/_app/repos/$repoId/pipelines/$pipelineId',
)({
  params: createZodParams(z.object({ pipelineId: zid('ciPipelines') })),
  loader: async ({
    context: { queryClient },
    params: { repoId, pipelineId },
  }) => {
    await ensureEntity(queryClient, pipelineQueryOptions(repoId, pipelineId))
  },
  notFoundComponent: () => <NotFound entity="Pipeline" />,
  component: Pipeline,
})

function Pipeline() {
  const { repoId, pipelineId } = Route.useParams()
  return <PipelinePage repoId={repoId} pipelineId={pipelineId} />
}
