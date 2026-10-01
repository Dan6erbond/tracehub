import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { NotFound } from '#/components/not-found'
import { PullRequestPage } from '#/components/pull-request-page'
import { pullRequestQueryOptions } from '#/hooks/use-pull-requests'
import { createZodParams } from '#/lib/create-zod-params'
import { ensureEntity } from '#/lib/ensure-entity'

export const Route = createFileRoute('/_app/repos/$repoId/pulls/$number')({
  params: createZodParams(z.object({ number: z.coerce.number().int() })),
  loader: async ({ context: { queryClient }, params: { repoId, number } }) => {
    await ensureEntity(queryClient, pullRequestQueryOptions(repoId, number))
  },
  notFoundComponent: () => <NotFound entity="Pull request" />,
  component: PullRequest,
})

function PullRequest() {
  const { repoId, number } = Route.useParams()
  return <PullRequestPage repoId={repoId} number={number} />
}
