import { createFileRoute } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { JobPage } from '#/components/job-page'
import { useRepo } from '#/hooks/use-repos'
import { createZodParams } from '#/lib/create-zod-params'

export const Route = createFileRoute('/_app/repos/$repoId/jobs/$jobId')({
  params: createZodParams(z.object({ jobId: zid('ciJobs') })),
  component: Job,
})

function Job() {
  const { repoId, jobId } = Route.useParams()
  const repo = useRepo(repoId)
  return repo.data ? <JobPage repo={repo.data} jobId={jobId} /> : null
}
