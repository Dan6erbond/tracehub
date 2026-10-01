import { createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { NotFound } from '#/components/not-found'
import { RunPage } from '#/components/run-page'
import { useCurrentRepo } from '#/hooks/use-current-repo'
import { runQueryOptions } from '#/hooks/use-runs'
import { createZodParams } from '#/lib/create-zod-params'
import { ensureEntity } from '#/lib/ensure-entity'

export const Route = createFileRoute('/_app/repos/$repoId/runs/$runId')({
  params: createZodParams(z.object({ runId: zid('runs') })),
  loader: async ({ context: { queryClient }, params: { repoId, runId } }) => {
    await ensureEntity(queryClient, runQueryOptions(repoId, runId))
  },
  notFoundComponent: () => <NotFound entity="Run" />,
  component: Run,
})

function Run() {
  const { runId } = Route.useParams()
  return <RunPage repo={useCurrentRepo()} runId={runId} />
}
