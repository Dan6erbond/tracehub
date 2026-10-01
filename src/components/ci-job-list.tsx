import { CiJobTable } from '#/components/ci-job-table'
import { SectionHeading } from '#/components/section-heading'
import { Skeleton } from '#/components/ui/skeleton'
import { useOtherChecks } from '#/hooks/use-ci-jobs'
import type { Id } from '../../convex/_generated/dataModel'

/** Checks of one commit that belong to no pipeline, such as commit statuses and check runs of other CI apps. */
export function CiJobList({
  repoId,
  sha,
}: {
  repoId: Id<'repos'>
  sha: string
}) {
  const checks = useOtherChecks(repoId, sha)

  if (checks.isPending) return <Skeleton className="h-24 w-full" />
  if (!checks.data?.jobs.length) return null

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Other checks</SectionHeading>
      <CiJobTable
        repoId={repoId}
        jobs={checks.data.jobs}
        truncated={checks.data.truncated}
      />
    </div>
  )
}
