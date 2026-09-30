import type { GitProvider, Repo } from '#/lib/schemas/repo'

type HostRepo = Pick<Repo, 'provider' | 'htmlUrl'>

const encodePath = (path: string) =>
  path.split('/').map(encodeURIComponent).join('/')

const hosts: Record<
  GitProvider,
  {
    label: string
    branchPath: (name: string) => string
    commitPath: (sha: string) => string
  }
> = {
  github: {
    label: 'GitHub',
    branchPath: (name) => `tree/${encodePath(name)}`,
    commitPath: (sha) => `commit/${sha}`,
  },
}

export const hostLabel = (repo: HostRepo) => hosts[repo.provider].label

export const branchUrl = (repo: HostRepo, name: string) =>
  `${repo.htmlUrl}/${hosts[repo.provider].branchPath(name)}`

export const commitUrl = (repo: HostRepo, sha: string) =>
  `${repo.htmlUrl}/${hosts[repo.provider].commitPath(sha)}`
