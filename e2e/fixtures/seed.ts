import { z } from 'zod'
import { gitHostApi } from './git-host-api'
import { gitHostUser } from './git-hosts'
import type { CommitState } from './git-host-api'
import type { GitHostName } from './git-hosts'

type RepoPlan = {
  name: string
  description: string
  private: boolean
  /** Branches besides `main`; the first one gets the pull request and the statuses. */
  branches: ReadonlyArray<string>
  statuses: ReadonlyArray<{ context: string; state: CommitState }>
}

const repoPlans: ReadonlyArray<RepoPlan> = [
  {
    name: 'shop',
    description: 'A web shop',
    private: false,
    branches: ['feature/checkout', 'hotfix/typo'],
    statuses: [
      { context: 'ci/build', state: 'success' },
      { context: 'ci/e2e', state: 'failure' },
    ],
  },
  {
    name: 'notes',
    description: 'Private notes',
    private: true,
    branches: [],
    statuses: [],
  },
]

export const seededRepoSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  description: z.string(),
  private: z.boolean(),
  defaultBranch: z.string(),
  branches: z.array(z.string()),
  pullRequest: z
    .object({
      number: z.number(),
      title: z.string(),
      branch: z.string(),
      headSha: z.string(),
    })
    .optional(),
})
export type SeededRepo = z.infer<typeof seededRepoSchema>

type Host = { name: GitHostName; baseUrl: string; apiUrl: string }

/** An OAuth app for TraceHub and the repos of `repoPlans`, owned by the host's user; repo names carry the host so the two lists never collide. */
export async function seedGitHost(host: Host, appCallbackUrl: string) {
  const { name, baseUrl, apiUrl } = host
  const { username, password } = gitHostUser(name)
  const api = gitHostApi({ apiUrl, username, password })

  const { client_id: clientId, client_secret: clientSecret } =
    await api.createOAuthApp({
      name: 'TraceHub',
      redirectUri: `${appCallbackUrl}/${name}`,
    })

  const repos: Array<SeededRepo> = []
  for (const plan of repoPlans) {
    const repoName = `${name}-${plan.name}`
    const { full_name: fullName, default_branch: defaultBranch } =
      await api.createRepo({ ...plan, name: repoName })
    const ref = { owner: username, repo: repoName }

    let pullRequest: SeededRepo['pullRequest']
    for (const branch of plan.branches) {
      await api.createBranch({ ...ref, branch, from: defaultBranch })
      await api.commitFile({
        ...ref,
        branch,
        path: `${branch.replace('/', '-')}.txt`,
        content: branch,
      })
    }
    const [pullBranch] = plan.branches
    if (pullBranch) {
      const title = `Merge ${pullBranch}`
      const { number, head } = await api.createPullRequest({
        ...ref,
        head: pullBranch,
        base: defaultBranch,
        title,
      })
      for (const status of plan.statuses)
        await api.setCommitStatus({ ...ref, sha: head.sha, ...status })
      pullRequest = {
        number,
        title,
        branch: pullBranch,
        headSha: head.sha,
      }
    }

    repos.push({
      name: repoName,
      fullName,
      description: plan.description,
      private: plan.private,
      defaultBranch,
      branches: plan.branches.slice(),
      pullRequest,
    })
  }

  return { name, baseUrl, clientId, clientSecret, repos }
}
