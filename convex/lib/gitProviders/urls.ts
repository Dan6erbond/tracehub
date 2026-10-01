import type { StoredCiJob } from '../../../src/lib/schemas/ci-job'
import type { CiPipeline } from '../../../src/lib/schemas/ci-pipeline'
import type { GitProviderType } from '../../../src/lib/schemas/git-provider'
import type { ProviderConfig, RepoHost } from './types'
import type { Repo } from '../../../src/lib/schemas/repo'

type PipelineRef = Pick<CiPipeline, 'externalId' | 'url' | 'webPath'>
type JobRef = Pick<StoredCiJob, 'externalId' | 'url' | 'webPath'>

/** Pages of a Git host relative to a repo's URL. The id-based ones are `undefined` when the id has no page of its own. */
type HostUrlScheme = {
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

export const isNumericId = (id: string) => /^\d+$/.test(id)

/** Run and job pages of Gitea and Forgejo are numbered differently per version, so they are only known from what the host reported. */
const giteaUrlScheme: HostUrlScheme = {
  branchPath: (name) => `src/branch/${encodePath(name)}`,
  commitPath: (sha) => `commit/${sha}`,
  pullPath: (number) => `pulls/${number}`,
  pipelinePath: () => undefined,
  jobPath: () => undefined,
}

const hostUrlSchemes: Record<GitProviderType, HostUrlScheme> = {
  github: {
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
  gitea: giteaUrlScheme,
  forgejo: giteaUrlScheme,
}

/** The only place that decides where a repo's pages start. */
export const repoBaseUrl = (
  { fullName }: Pick<Repo, 'fullName'>,
  { baseUrl }: Pick<ProviderConfig, 'baseUrl'>,
) => `${baseUrl}/${fullName}`

const scheme = ({ provider }: RepoHost) => hostUrlSchemes[provider.type]

const hostBase = ({ repo, provider }: RepoHost) => repoBaseUrl(repo, provider)

/** A stored path is data from a host, so a result that leaves the repo's pages is dropped. */
const pageUrl = (host: RepoHost, path?: string) => {
  if (path === undefined) return undefined
  const base = `${hostBase(host)}/`
  const url = new URL(path, base).href
  return url.startsWith(base) ? url : undefined
}

export const branchUrl = (host: RepoHost, name: string) =>
  `${hostBase(host)}/${scheme(host).branchPath(name)}`

export const commitUrl = (host: RepoHost, sha: string) =>
  `${hostBase(host)}/${scheme(host).commitPath(sha)}`

export const pullUrl = (host: RepoHost, number: number) =>
  `${hostBase(host)}/${scheme(host).pullPath(number)}`

/** A pipeline's page: its own URL when the CI is outside the Git host, else the host's stored path, else derived from its id. */
export const pipelineUrl = (host: RepoHost, pipeline: PipelineRef) =>
  pipeline.url ??
  pageUrl(
    host,
    pipeline.webPath ?? scheme(host).pipelinePath(pipeline.externalId),
  )

/** A job's page: the commit status's own target, else the host's stored path, else derived from its id and the id of its pipeline. */
export const jobUrl = (
  host: RepoHost,
  job: JobRef,
  pipeline?: Pick<CiPipeline, 'externalId'> | null,
) =>
  job.url ??
  pageUrl(
    host,
    job.webPath ??
      (job.externalId === undefined
        ? undefined
        : scheme(host).jobPath(job.externalId, pipeline?.externalId)),
  )
