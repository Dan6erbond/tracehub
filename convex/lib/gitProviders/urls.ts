import type { StoredCiJob } from '../../../src/lib/schemas/ci-job'
import type { CiPipeline } from '../../../src/lib/schemas/ci-pipeline'
import type { GitProvider, Repo } from '../../../src/lib/schemas/repo'

type HostRepo = Pick<Repo, 'provider' | 'htmlUrl'>
type PipelineRef = Pick<CiPipeline, 'externalId' | 'url' | 'webPath'>
type JobRef = Pick<StoredCiJob, 'externalId' | 'url' | 'webPath'>

/** Pages of a Git host relative to a repo's URL. The id-based ones are `undefined` when the id has no page of its own. */
type HostUrlScheme = {
  label: string
  branchPath: (name: string) => string
  commitPath: (sha: string) => string
  pullPath: (number: number) => string
  pipelinePath: (externalId: string) => string | undefined
  jobPath: (
    externalId: string,
    pipelineExternalId?: string,
  ) => string | undefined
}

const encodePath = (path: string) =>
  path.split('/').map(encodeURIComponent).join('/')

const isNumericId = (id: string) => /^\d+$/.test(id)

const hostUrlSchemes: Record<GitProvider, HostUrlScheme> = {
  github: {
    label: 'GitHub',
    branchPath: (name) => `tree/${encodePath(name)}`,
    commitPath: (sha) => `commit/${sha}`,
    pullPath: (number) => `pull/${number}`,
    // Ids are numeric; anything else is a commit status context, which has no page of its own.
    pipelinePath: (id) => (isNumericId(id) ? `actions/runs/${id}` : undefined),
    // Outside a pipeline, `runs/<id>` resolves any check run, including ones of other CI apps.
    jobPath: (id, pipelineId) => {
      if (!isNumericId(id)) return undefined
      return pipelineId !== undefined && isNumericId(pipelineId)
        ? `actions/runs/${pipelineId}/job/${id}`
        : `runs/${id}`
    },
  },
}

/** The only place that decides where a repo's pages start. */
export const repoBaseUrl = ({ htmlUrl }: Pick<Repo, 'htmlUrl'>) =>
  htmlUrl.replace(/\/+$/, '')

/** A stored path is data from a host, so a result that leaves the repo's pages is dropped. */
const pageUrl = (repo: Pick<Repo, 'htmlUrl'>, path?: string) => {
  if (path === undefined) return undefined
  const base = `${repoBaseUrl(repo)}/`
  const url = new URL(path, base).href
  return url.startsWith(base) ? url : undefined
}

export const providerLabel = ({ provider }: Pick<Repo, 'provider'>) =>
  hostUrlSchemes[provider].label

export const branchUrl = (repo: HostRepo, name: string) =>
  `${repoBaseUrl(repo)}/${hostUrlSchemes[repo.provider].branchPath(name)}`

export const commitUrl = (repo: HostRepo, sha: string) =>
  `${repoBaseUrl(repo)}/${hostUrlSchemes[repo.provider].commitPath(sha)}`

export const pullUrl = (repo: HostRepo, number: number) =>
  `${repoBaseUrl(repo)}/${hostUrlSchemes[repo.provider].pullPath(number)}`

/** A pipeline's page: its own URL when the CI is outside the Git host, else the host's stored path, else derived from its id. */
export const pipelineUrl = (repo: HostRepo, pipeline: PipelineRef) =>
  pipeline.url ??
  pageUrl(
    repo,
    pipeline.webPath ??
      hostUrlSchemes[repo.provider].pipelinePath(pipeline.externalId),
  )

/** A job's page: the commit status's own target, else the host's stored path, else derived from its id and the id of its pipeline. */
export const jobUrl = (
  repo: HostRepo,
  job: JobRef,
  pipeline?: Pick<CiPipeline, 'externalId'> | null,
) =>
  job.url ??
  pageUrl(
    repo,
    job.webPath ??
      (job.externalId === undefined
        ? undefined
        : hostUrlSchemes[repo.provider].jobPath(
            job.externalId,
            pipeline?.externalId,
          )),
  )
