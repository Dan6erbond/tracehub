import { Pin } from 'lucide-react'
import { LinkCard } from '#/components/card-link'
import { CommitTimestamp } from '#/components/commit-timestamp'
import { ExternalTextLink } from '#/components/external-text-link'
import { PullRequestBadge } from '#/components/pull-request-badge'
import { StretchedLink } from '#/components/stretched-link'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import {
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { runName } from '#/lib/run-name'
import type { RunDetail } from '../../convex/runs'

export function RunCard({ run }: { run: RunDetail }) {
  return (
    <LinkCard>
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
          {run.pinnedAt !== undefined && (
            <Pin className="size-4 shrink-0 text-muted-foreground" />
          )}
          <StretchedLink
            to="/repos/$repoId/runs/$runId"
            params={{ repoId: run.repoId, runId: run._id }}
            className="min-w-0 truncate"
          >
            {runName(run)}
          </StretchedLink>
        </CardTitle>
        <CardDescription>
          <CommitTimestamp
            sha={run.sha}
            commitUrl={run.commitUrl}
            timestamp={run._creationTime}
          />
        </CardDescription>
        {run.ciUrl && (
          <CardAction>
            <ExternalTextLink href={run.ciUrl} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {run.description && (
          <p className="text-sm text-muted-foreground">{run.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {run.prNumber !== undefined && (
            <PullRequestBadge
              pullRequest={{ number: run.prNumber }}
              repoId={run.repoId}
            />
          )}
          <TraceCountsBadges counts={run.traceCounts} />
        </div>
      </CardContent>
    </LinkCard>
  )
}
