import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PullRequestPage } from '#/components/pull-request-page'
import { useRepo } from '#/hooks/use-repos'
import { createZodParams } from '#/lib/create-zod-params'

export const Route = createFileRoute('/_app/repos/$repoId/pulls/$number')({
  params: createZodParams(z.object({ number: z.coerce.number().int() })),
  component: PullRequest,
})

function PullRequest() {
  const { repoId, number } = Route.useParams()
  const repo = useRepo(repoId)
  return repo.data ? <PullRequestPage repo={repo.data} number={number} /> : null
}
