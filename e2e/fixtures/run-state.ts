import { z } from 'zod'
import { seededRepoSchema } from './seed'
import { gitHostNameSchema } from './git-hosts'
import type { GitHostName } from './git-hosts'

const ENV_NAME = 'E2E_RUN_STATE'

const runStateSchema = z.object({
  appUrl: z.url(),
  gitHosts: z.array(
    z.object({
      name: gitHostNameSchema,
      baseUrl: z.url(),
      clientId: z.string(),
      clientSecret: z.string(),
      repos: z.array(seededRepoSchema),
    }),
  ),
})
export type RunState = z.infer<typeof runStateSchema>

/** Global setup hands what it started to the workers through the environment, which they inherit. */
export const publishRunState = (state: RunState) => {
  process.env[ENV_NAME] = JSON.stringify(runStateSchema.parse(state))
}

export const runState = () =>
  runStateSchema.parse(JSON.parse(process.env[ENV_NAME] ?? 'null'))

export const gitHostState = (name: GitHostName) => {
  const host = runState().gitHosts.find((candidate) => candidate.name === name)
  if (!host) throw new Error(`No ${name} host in the run state`)
  return host
}

/** The seeded repo with a pull request and commit statuses. */
export const repoWithPullRequest = (name: GitHostName) => {
  for (const { pullRequest, ...repo } of gitHostState(name).repos)
    if (pullRequest) return { ...repo, pullRequest }
  throw new Error(`No ${name} repo with a pull request was seeded`)
}
