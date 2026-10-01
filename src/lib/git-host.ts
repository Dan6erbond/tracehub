import type { GitProvider, Repo } from '#/lib/schemas/repo'
import type { StoredCiJob } from '#/lib/schemas/ci-job'
import type { CiPipeline } from '#/lib/schemas/ci-pipeline'

type HostRepo = Pick<Repo, 'provider' | 'htmlUrl'>
type PipelineRef = Pick<CiPipeline, 'externalId' | 'url'>
type JobRef = Pick<StoredCiJob, 'externalId' | 'url'>

const encodePath = (path: string) =>
  path.split('/').map(encodeURIComponent).join('/')

const isGitHubId = (id: string) => /^\d+$/.test(id)

const hosts: Record<
  GitProvider,
  {
    label: string
    branchPath: (name: string) => string
    commitPath: (sha: string) => string
    pullPath: (number: number) => string
    pipelinePath: (externalId: string) => string | undefined
    jobPath: (externalId: string) => string | undefined
  }
> = {
  github: {
    label: 'GitHub',
    branchPath: (name) => `tree/${encodePath(name)}`,
    commitPath: (sha) => `commit/${sha}`,
    pullPath: (number) => `pull/${number}`,
    // Ids are numeric; anything else is a commit status context, which has no page of its own.
    pipelinePath: (id) => (isGitHubId(id) ? `actions/runs/${id}` : undefined),
    // `runs/<id>` resolves any check run, including ones of other CI apps, and sends Actions jobs on to their job page.
    jobPath: (id) => (isGitHubId(id) ? `runs/${id}` : undefined),
  },
}

const hostUrl = (repo: HostRepo, path?: string) =>
  path === undefined ? undefined : `${repo.htmlUrl}/${path}`

export const hostLabel = (repo: HostRepo) => hosts[repo.provider].label

export const branchUrl = (repo: HostRepo, name: string) =>
  `${repo.htmlUrl}/${hosts[repo.provider].branchPath(name)}`

export const commitUrl = (repo: HostRepo, sha: string) =>
  `${repo.htmlUrl}/${hosts[repo.provider].commitPath(sha)}`

export const pullUrl = (repo: HostRepo, number: number) =>
  `${repo.htmlUrl}/${hosts[repo.provider].pullPath(number)}`

/** A pipeline's page: its own URL when the CI is outside the Git host, else derived from its id so it survives a host URL change. */
export const pipelineUrl = (repo: HostRepo, pipeline: PipelineRef) =>
  pipeline.url ??
  hostUrl(repo, hosts[repo.provider].pipelinePath(pipeline.externalId))

/** A job's page: the commit status's own target, else derived from its id. */
export const jobUrl = (repo: HostRepo, job: JobRef) =>
  job.url ??
  (job.externalId === undefined
    ? undefined
    : hostUrl(repo, hosts[repo.provider].jobPath(job.externalId)))

/** The CI page of a run: its job's, else its pipeline's. */
export const runCiUrl = (
  repo: HostRepo,
  { job, pipeline }: { job: JobRef | null; pipeline: PipelineRef | null },
) => {
  if (job) return jobUrl(repo, job)
  return pipeline ? pipelineUrl(repo, pipeline) : undefined
}
