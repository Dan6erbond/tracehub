import { createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { JobPage } from '#/components/job-page'
import { useCurrentRepo } from '#/hooks/use-current-repo'
import { createZodParams } from '#/lib/create-zod-params'

export const Route = createFileRoute('/_app/repos/$repoId/jobs/$jobId')({
  params: createZodParams(z.object({ jobId: zid('ciJobs') })),
  component: Job,
})

function Job() {
  const { jobId } = Route.useParams()
  return <JobPage repo={useCurrentRepo()} jobId={jobId} />
}
