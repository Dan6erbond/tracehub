import { Link } from '@tanstack/react-router'
import { ExternalLink, GitPullRequest, Pin } from 'lucide-react'
import { CommitLink } from '#/components/commit-link'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { runCiUrl } from '#/lib/git-host'
import { runName } from '#/lib/run-name'
import type { RunDetail } from '../../convex/runs'
import type { Repo } from '#/lib/schemas/repo'

export function RunCard({
  run,
  repo,
}: {
  run: RunDetail
  repo: Pick<Repo, 'provider' | 'htmlUrl'>
}) {
  const ciHref = runCiUrl(repo, run)
  return (
    <Card className="relative transition-colors hover:bg-accent/50">
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
          {run.pinnedAt !== undefined && (
            <Pin className="size-4 shrink-0 text-muted-foreground" />
          )}
          <Link
            to="/repos/$repoId/runs/$runId"
            params={{ repoId: run.repoId, runId: run._id }}
            className="min-w-0 truncate after:absolute after:inset-0"
          >
            {runName(run)}
          </Link>
        </CardTitle>
        <CardDescription>
          <CommitLink repo={repo} sha={run.sha} /> ·{' '}
          {new Date(run._creationTime).toLocaleString()}
        </CardDescription>
        {ciHref && (
          <CardAction>
            <a
              href={ciHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Open pipeline"
              className="relative z-10 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-4" />
            </a>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {run.description && (
          <p className="text-sm text-muted-foreground">{run.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {run.prNumber !== undefined && (
            <Badge asChild variant="outline" className="relative z-10">
              <Link
                to="/repos/$repoId/pulls/$number"
                params={{ repoId: run.repoId, number: run.prNumber }}
              >
                <GitPullRequest />#{run.prNumber}
              </Link>
            </Badge>
          )}
          <TraceCountsBadges counts={run.traceCounts} />
        </div>
      </CardContent>
    </Card>
  )
}
