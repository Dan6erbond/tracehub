import { Pin, PinOff } from 'lucide-react'
import { BackLink } from '#/components/back-link'
import { CommitTimestamp } from '#/components/commit-timestamp'
import { ExternalTextLink } from '#/components/external-text-link'
import { PageHeader } from '#/components/page-header'
import { PaginatedList } from '#/components/paginated-list'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { RunCiDetails } from '#/components/run-ci-details'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import { TraceTable } from '#/components/trace-table'
import { Button } from '#/components/ui/button'
import { UploadTracesButton } from '#/components/upload-traces-button'
import { useSetRunPinned, useRun } from '#/hooks/use-runs'
import { TRACES_PAGE_SIZE, useTraces } from '#/hooks/use-traces'
import { runCiUrl } from '#/lib/git-host'
import { runName } from '#/lib/run-name'
import type { RunDetail } from '../../convex/runs'
import type { Doc, Id } from '../../convex/_generated/dataModel'

/** Leads back to the pull request or branch the run belongs to, taken from its pipeline when the run states neither, else to the branches. */
function RunBackLink({
  repoId,
  run: { prNumber: runPrNumber, branch: runBranch, pipeline },
}: {
  repoId: Id<'repos'>
  run: Pick<RunDetail, 'prNumber' | 'branch' | 'pipeline'>
}) {
  const prNumber = runPrNumber ?? pipeline?.prNumber
  const branch = runBranch ?? pipeline?.branch
  if (prNumber !== undefined)
    return (
      <BackLink
        to="/repos/$repoId/pulls/$number"
        params={{ repoId, number: prNumber }}
      >
        Pull request #{prNumber}
      </BackLink>
    )
  if (branch !== undefined)
    return (
      <BackLink
        to="/repos/$repoId/branches/$"
        params={{ repoId, _splat: branch }}
      >
        {branch}
      </BackLink>
    )
  return (
    <BackLink to="/repos/$repoId" params={{ repoId }}>
      Branches
    </BackLink>
  )
}

export function RunPage({
  repo,
  runId,
}: {
  repo: Doc<'repos'>
  runId: Id<'runs'>
}) {
  const repoId = repo._id
  const run = useRun(repoId, runId)
  const traces = useTraces(repoId, runId)
  const setPinned = useSetRunPinned()
  const pinned = run.pinnedAt !== undefined
  const ciHref = runCiUrl(repo, run)

  return (
    <div className="flex flex-col gap-4">
      <RunBackLink repoId={repoId} run={run} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <PageHeader
            title={runName(run)}
            badges={
              run.prNumber !== undefined && (
                <PullRequestBadge
                  pullRequest={{ number: run.prNumber }}
                  repoId={repoId}
                />
              )
            }
            meta={
              <CommitTimestamp
                repo={repo}
                sha={run.sha}
                timestamp={run._creationTime}
              />
            }
          />
          <RunCiDetails repo={repo} run={run} />
          {run.description && <p>{run.description}</p>}
          <TraceCountsBadges counts={run.traceCounts} />
        </div>
        <div className="flex items-center gap-4">
          {ciHref && (
            <ExternalTextLink href={ciHref}>View in CI</ExternalTextLink>
          )}
          {run.prNumber !== undefined && (
            <Button
              variant="outline"
              disabled={setPinned.isPending}
              onClick={() =>
                setPinned.mutate({ repoId, runId, pinned: !pinned })
              }
            >
              {pinned ? <PinOff /> : <Pin />}
              {pinned ? 'Unpin' : 'Pin'}
            </Button>
          )}
          <UploadTracesButton repoId={repoId} target={{ job: runId }} />
        </div>
      </div>
      <PaginatedList
        query={traces}
        pageSize={TRACES_PAGE_SIZE}
        empty={<p className="text-muted-foreground">No traces in this run.</p>}
      >
        {(results) => <TraceTable traces={results} />}
      </PaginatedList>
    </div>
  )
}
