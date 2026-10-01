import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PullRequestPage } from '#/components/pull-request-page'
import { useCurrentRepo } from '#/hooks/use-current-repo'
import { createZodParams } from '#/lib/create-zod-params'

export const Route = createFileRoute('/_app/repos/$repoId/pulls/$number')({
  params: createZodParams(z.object({ number: z.coerce.number().int() })),
  component: PullRequest,
})

function PullRequest() {
  const { number } = Route.useParams()
  return <PullRequestPage repo={useCurrentRepo()} number={number} />
}
