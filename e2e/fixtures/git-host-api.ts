import { z } from 'zod'

const oauthAppSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
})
const repoSchema = z.object({
  full_name: z.string(),
  default_branch: z.string(),
})
const commitSchema = z.object({ commit: z.object({ sha: z.string() }) })
const pullRequestSchema = z.object({
  number: z.number(),
  head: z.object({ sha: z.string() }),
})

export type CommitState = 'pending' | 'success' | 'failure' | 'error'

type Credentials = { apiUrl: string; username: string; password: string }
type RepoRef = { owner: string; repo: string }

/** The slice of the Gitea and Forgejo REST API the fixtures need, authenticated as one user. */
export function gitHostApi({ apiUrl, username, password }: Credentials) {
  const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`

  async function post<TSchema extends z.ZodType>(
    path: string,
    schema: TSchema,
    body: unknown,
  ): Promise<z.infer<TSchema>> {
    const response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok)
      throw new Error(
        `POST ${path} answered ${response.status}: ${await response.text()}`,
      )
    return schema.parse(await response.json())
  }

  return {
    createOAuthApp: ({
      name,
      redirectUri,
    }: {
      name: string
      redirectUri: string
    }) =>
      post('/user/applications/oauth2', oauthAppSchema, {
        name,
        redirect_uris: [redirectUri],
        confidential_client: true,
      }),

    createRepo: (body: {
      name: string
      description: string
      private: boolean
    }) =>
      post('/user/repos', repoSchema, {
        ...body,
        auto_init: true,
        readme: 'Default',
        default_branch: 'main',
      }),

    createBranch: ({
      owner,
      repo,
      branch,
      from,
    }: RepoRef & { branch: string; from: string }) =>
      post(`/repos/${owner}/${repo}/branches`, z.unknown(), {
        new_branch_name: branch,
        old_branch_name: from,
      }),

    commitFile: ({
      owner,
      repo,
      branch,
      path,
      content,
    }: RepoRef & { branch: string; path: string; content: string }) =>
      post(`/repos/${owner}/${repo}/contents/${path}`, commitSchema, {
        branch,
        content: Buffer.from(content).toString('base64'),
        message: `Add ${path}`,
      }),

    createPullRequest: ({
      owner,
      repo,
      head,
      base,
      title,
    }: RepoRef & { head: string; base: string; title: string }) =>
      post(`/repos/${owner}/${repo}/pulls`, pullRequestSchema, {
        head,
        base,
        title,
      }),

    setCommitStatus: ({
      owner,
      repo,
      sha,
      context,
      state,
    }: RepoRef & {
      sha: string
      context: string
      state: CommitState
    }) =>
      post(`/repos/${owner}/${repo}/statuses/${sha}`, z.unknown(), {
        context,
        state,
        description: `${context} ${state}`,
        target_url: 'https://ci.example.test/builds/1',
      }),
  }
}

export type GitHostApi = ReturnType<typeof gitHostApi>
