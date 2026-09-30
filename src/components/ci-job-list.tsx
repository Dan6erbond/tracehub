import { CiJobTable } from '#/components/ci-job-table'
import { Skeleton } from '#/components/ui/skeleton'
import { useCiJobs } from '#/hooks/use-ci-jobs'
import type { Doc } from '../../convex/_generated/dataModel'

/** Checks of one commit that belong to no pipeline, such as commit statuses and check runs of other CI apps. */
export function CiJobList({ repo, sha }: { repo: Doc<'repos'>; sha: string }) {
  const jobs = useCiJobs(repo._id, sha)
  const checks = jobs.data?.filter((job) => job.pipelineId === undefined)

  if (jobs.isPending) return <Skeleton className="h-24 w-full" />
  if (!checks?.length) return null

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Other checks</h3>
      <CiJobTable repo={repo} jobs={checks} />
    </div>
  )
}
