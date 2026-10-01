import { z } from 'zod'

/** Gitea and Forgejo send `null` for what is unset and leave out what a release does not know yet; such a field, or one of an unexpected type, counts as absent. */
const optionalField = <T extends z.ZodType>(schema: T) =>
  schema.nullish().catch(undefined)

const timestamp = optionalField(z.string())

/** A list the host may answer with `null` when it is empty. */
const listOf = <T extends z.ZodType>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((items) => items ?? [])

const idSchema = z.object({ id: z.number() })

export const giteaProfileSchema = z.object({
  id: z.number(),
  login: z.string(),
  full_name: optionalField(z.string()),
  email: optionalField(z.string()),
  avatar_url: optionalField(z.string()),
})

export const giteaRepoSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  name: z.string(),
  owner: z.object({ login: z.string() }),
  private: z.boolean(),
  description: optionalField(z.string()),
  default_branch: optionalField(z.string()),
  updated_at: timestamp,
})

export const giteaBranchSchema = z.object({
  name: z.string(),
  commit: optionalField(z.object({ id: z.string(), timestamp })),
})

const pullBranchSchema = z.object({
  ref: z.string(),
  sha: z.string(),
  repo_id: z.number(),
})

export const giteaPullSchema = z.object({
  number: z.number(),
  title: z.string(),
  // Gitea before 1.22 has no drafts.
  draft: z.boolean().catch(false),
  head: pullBranchSchema,
  base: pullBranchSchema,
  user: optionalField(z.object({ login: z.string() })),
  updated_at: z.string(),
  closed_at: timestamp,
  merged_at: timestamp,
})

const commitStateSchema = z
  .enum(['pending', 'success', 'error', 'failure', 'warning', 'skipped'])
  .catch('pending')
export type CommitState = z.infer<typeof commitStateSchema>

const commitStatusSchema = z.object({
  context: z.string(),
  status: commitStateSchema,
  target_url: optionalField(z.string()),
})
export type CommitStatus = z.infer<typeof commitStatusSchema>

/** Only the statuses are read: the `state` is combined from one page of them, and Forgejo sends it empty without statuses. */
export const giteaCombinedStatusSchema = z.object({
  statuses: listOf(commitStatusSchema),
})

const giteaRunSchema = z.object({
  id: z.number(),
  display_title: z.string().catch(''),
  head_sha: z.string(),
  // Empty for runs of pull requests and tags.
  head_branch: optionalField(z.string()),
  event: optionalField(z.string()),
  status: optionalField(z.string()),
  conclusion: optionalField(z.string()),
  html_url: optionalField(z.string()),
  // Gitea 1.25 sends no creation or update time.
  created_at: timestamp,
  updated_at: timestamp,
  started_at: timestamp,
  completed_at: timestamp,
  pull_requests: optionalField(z.array(z.object({ number: z.number() }))),
  repository: optionalField(idSchema),
  head_repository: optionalField(idSchema),
})
export type GiteaRun = z.infer<typeof giteaRunSchema>

export const giteaRunsSchema = z.object({
  total_count: z.number(),
  workflow_runs: listOf(giteaRunSchema),
})

const giteaJobSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: optionalField(z.string()),
  conclusion: optionalField(z.string()),
  html_url: optionalField(z.string()),
  started_at: timestamp,
  completed_at: timestamp,
})

export const giteaJobsSchema = z.object({
  total_count: z.number(),
  jobs: listOf(giteaJobSchema),
})

const forgejoRunSchema = z.object({
  id: z.number(),
  title: z.string().catch(''),
  commit_sha: z.string(),
  // The short name of the run's ref (a branch or a tag), or `#<number>` for a pull request.
  prettyref: z.string().catch(''),
  event: z.string().catch(''),
  trigger_event: optionalField(z.string()),
  status: z.string().catch(''),
  html_url: optionalField(z.string()),
  is_fork_pull_request: z.boolean().catch(false),
  created: timestamp,
  started: timestamp,
  stopped: timestamp,
})
export type ForgejoRun = z.infer<typeof forgejoRunSchema>

export const forgejoRunsSchema = z.object({
  total_count: z.number(),
  workflow_runs: listOf(forgejoRunSchema),
})

export const forgejoJobsSchema = listOf(
  z.object({
    id: z.number(),
    name: z.string(),
    status: z.string().catch(''),
    html_url: optionalField(z.string()),
  }),
)
