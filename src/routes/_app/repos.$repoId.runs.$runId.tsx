import { createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { RunPage } from '#/components/run-page'
import { useRepo } from '#/hooks/use-repos'
import { createZodParams } from '#/lib/create-zod-params'

export const Route = createFileRoute('/_app/repos/$repoId/runs/$runId')({
  params: createZodParams(z.object({ runId: zid('runs') })),
  component: Run,
})

function Run() {
  const { repoId, runId } = Route.useParams()
  const repo = useRepo(repoId)
  return repo.data ? <RunPage repo={repo.data} runId={runId} /> : null
}
