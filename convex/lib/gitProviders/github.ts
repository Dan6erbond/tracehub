import { Octokit } from '@octokit/rest'
import type { GitProviderAdapter } from './types'

export const githubAdapter: GitProviderAdapter = {
  authProviderId: 'github',
  listRepositories: async (accessToken) => {
    const octokit = new Octokit({ auth: accessToken })
    const repos = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      { per_page: 100, affiliation: 'owner,collaborator,organization_member' },
    )
    return repos.map((repo) => ({
      provider: 'github',
      externalId: String(repo.id),
      fullName: repo.full_name,
      owner: repo.owner.login,
      name: repo.name,
      private: repo.private,
      htmlUrl: repo.html_url,
      description: repo.description ?? undefined,
      defaultBranch: repo.default_branch,
    }))
  },
}
