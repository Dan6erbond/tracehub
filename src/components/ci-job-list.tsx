import { CiJobTable } from '#/components/ci-job-table'
import { SectionHeading } from '#/components/section-heading'
import { Skeleton } from '#/components/ui/skeleton'
import { useOtherChecks } from '#/hooks/use-ci-jobs'
import type { Doc } from '../../convex/_generated/dataModel'

/** Checks of one commit that belong to no pipeline, such as commit statuses and check runs of other CI apps. */
export function CiJobList({ repo, sha }: { repo: Doc<'repos'>; sha: string }) {
  const checks = useOtherChecks(repo._id, sha)

  if (checks.isPending) return <Skeleton className="h-24 w-full" />
  if (!checks.data?.jobs.length) return null

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading>Other checks</SectionHeading>
      <CiJobTable
        repo={repo}
        jobs={checks.data.jobs}
        truncated={checks.data.truncated}
      />
    </div>
  )
}
