import { z } from 'zod'

export const pullRequestStateSchema = z.enum(['open', 'closed', 'merged'])
export type PullRequestState = z.infer<typeof pullRequestStateSchema>

export const pullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  state: pullRequestStateSchema,
  draft: z.boolean(),
  headBranch: z.string(),
  headSha: z.string(),
  baseBranch: z.string(),
  // Fork PRs can reuse a branch name of the base repo, so they never attach to a branch.
  fromFork: z.boolean(),
  author: z.string().optional(),
  htmlUrl: z.string(),
  updatedAt: z.number(),
})
export type PullRequest = z.infer<typeof pullRequestSchema>
