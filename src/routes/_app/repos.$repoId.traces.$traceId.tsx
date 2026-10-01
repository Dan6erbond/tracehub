import { createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { NotFound } from '#/components/not-found'
import { TracePage } from '#/components/trace-page'
import { runQueryOptions } from '#/hooks/use-runs'
import { traceQueryOptions } from '#/hooks/use-traces'
import { createZodParams } from '#/lib/create-zod-params'
import { ensureEntity } from '#/lib/ensure-entity'

export const Route = createFileRoute('/_app/repos/$repoId/traces/$traceId')({
  params: createZodParams(z.object({ traceId: zid('traces') })),
  loader: async ({ context: { queryClient }, params: { repoId, traceId } }) => {
    const { runId } = await ensureEntity(
      queryClient,
      traceQueryOptions(repoId, traceId),
    )
    await ensureEntity(queryClient, runQueryOptions(repoId, runId))
  },
  notFoundComponent: () => <NotFound entity="Trace" />,
  component: Trace,
})

function Trace() {
  const { repoId, traceId } = Route.useParams()
  return <TracePage repoId={repoId} traceId={traceId} />
}
