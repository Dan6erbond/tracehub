import { z } from 'zod'

export const pullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  draft: z.boolean(),
  headBranch: z.string(),
  headSha: z.string(),
  baseBranch: z.string(),
  // Fork PRs can reuse a branch name of the base repo, so they never attach to a branch.
  fromFork: z.boolean(),
  author: z.string().optional(),
  updatedAt: z.number(),
  // Open while unset; a merged pull request is closed too.
  closedAt: z.number().optional(),
  mergedAt: z.number().optional(),
})
export type PullRequest = z.infer<typeof pullRequestSchema>
