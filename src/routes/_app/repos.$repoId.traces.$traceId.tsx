import { createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { TracePage } from '#/components/trace-page'
import { createZodParams } from '#/lib/create-zod-params'

export const Route = createFileRoute('/_app/repos/$repoId/traces/$traceId')({
  params: createZodParams(z.object({ traceId: zid('traces') })),
  component: Trace,
})

function Trace() {
  const { repoId, traceId } = Route.useParams()
  return <TracePage repoId={repoId} traceId={traceId} />
}
