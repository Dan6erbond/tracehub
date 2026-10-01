import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { NotFound } from '#/components/not-found'
import { TraceTargetPage } from '#/components/trace-target-page'
import { UploadTracesSheet } from '#/components/upload-traces-sheet'
import { branchQueryOptions } from '#/hooks/use-branches'
import { useCurrentRepo } from '#/hooks/use-current-repo'
import { pullRequestQueryOptions } from '#/hooks/use-pull-requests'
import { repoQueryOptions } from '#/hooks/use-repos'
import { runQueryOptions } from '#/hooks/use-runs'
import { ensureEntity, ensureQuery } from '#/lib/ensure-entity'
import {
  targetBranch,
  traceTargetSearchSchema,
} from '#/lib/schemas/trace-target'

export const Route = createFileRoute('/_app/repos/$repoId/traces/create')({
  validateSearch: traceTargetSearchSchema,
  loaderDeps: ({ search: { branch, pull, job } }) => ({ branch, pull, job }),
  loader: async ({ context: { queryClient }, params: { repoId }, deps }) => {
    if (deps.job) {
      await ensureEntity(queryClient, runQueryOptions(repoId, deps.job))
    } else if (deps.pull) {
      await ensureEntity(
        queryClient,
        pullRequestQueryOptions(repoId, deps.pull),
      )
    } else {
      const repo = await ensureEntity(queryClient, repoQueryOptions(repoId))
      const name = targetBranch(deps, repo)
      // A branch that is not stored yet is a valid upload target, so it may resolve to null.
      if (name) await ensureQuery(queryClient, branchQueryOptions(repoId, name))
    }
  },
  notFoundComponent: () => <NotFound entity="Upload target" />,
  component: CreateTraces,
})

function CreateTraces() {
  const { repoId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const repo = useCurrentRepo()

  const close = () => {
    const { pull, job } = search
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
    const name = targetBranch(search, repo)
    return name
      ? navigate({
          to: '/repos/$repoId/branches/$',
          params: { repoId, _splat: name },
        })
      : navigate({ to: '/repos/$repoId', params: { repoId } })
  }

  return (
    <>
      <TraceTargetPage repo={repo} search={search} />
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
