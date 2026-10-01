import { createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { JobPage } from '#/components/job-page'
import { NotFound } from '#/components/not-found'
import { jobQueryOptions } from '#/hooks/use-ci-jobs'
import { useCurrentRepo } from '#/hooks/use-current-repo'
import { createZodParams } from '#/lib/create-zod-params'
import { ensureEntity } from '#/lib/ensure-entity'

export const Route = createFileRoute('/_app/repos/$repoId/jobs/$jobId')({
  params: createZodParams(z.object({ jobId: zid('ciJobs') })),
  loader: async ({ context: { queryClient }, params: { repoId, jobId } }) => {
    await ensureEntity(queryClient, jobQueryOptions(repoId, jobId))
  },
  notFoundComponent: () => <NotFound entity="Job" />,
  component: Job,
})

function Job() {
  const { jobId } = Route.useParams()
  return <JobPage repo={useCurrentRepo()} jobId={jobId} />
}
