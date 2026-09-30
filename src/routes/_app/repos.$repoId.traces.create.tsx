import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BranchPage } from '#/components/branch-page'
import { PullRequestPage } from '#/components/pull-request-page'
import { RepoBranchesPage } from '#/components/repo-branches-page'
import { RunPage } from '#/components/run-page'
import { UploadTracesSheet } from '#/components/upload-traces-sheet'
import { useRepo } from '#/hooks/use-repos'
import { traceTargetSearchSchema } from '#/lib/schemas/trace-target'
import type { Doc } from '../../../convex/_generated/dataModel'
import type { TraceTargetSearch } from '#/lib/schemas/trace-target'

export const Route = createFileRoute('/_app/repos/$repoId/traces/create')({
  validateSearch: traceTargetSearchSchema,
  component: CreateTraces,
})

/** The page the upload is for, so it stays visible behind the sheet. */
function TargetPage({
  repo,
  search: { branch, pull, job },
}: {
  repo: Doc<'repos'>
  search: TraceTargetSearch
}) {
  if (job) return <RunPage repo={repo} runId={job} />
  if (pull) return <PullRequestPage repo={repo} number={pull} />
  const name = branch ?? repo.defaultBranch
  return name ? (
    <BranchPage repo={repo} name={name} />
  ) : (
    <RepoBranchesPage repo={repo} />
  )
}

function CreateTraces() {
  const { repoId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const { data: repo } = useRepo(repoId)
  if (!repo) return null

  const close = () => {
    const { branch, pull, job } = search
    if (job)
      return navigate({
        to: '/repos/$repoId/runs/$runId',
        params: { repoId, runId: job },
      })
    if (pull)
      return navigate({
        to: '/repos/$repoId/pulls/$number',
        params: { repoId, number: pull },
      })
    const name = branch ?? repo.defaultBranch
    return name
      ? navigate({
          to: '/repos/$repoId/branches/$',
          params: { repoId, _splat: name },
        })
      : navigate({ to: '/repos/$repoId', params: { repoId } })
  }

  return (
    <>
      <TargetPage repo={repo} search={search} />
      <UploadTracesSheet
        repo={repo}
        search={search}
        onClose={() => void close()}
        onCreated={(runId) =>
          void navigate({
            to: '/repos/$repoId/runs/$runId',
            params: { repoId, runId },
          })
        }
      />
    </>
  )
}
