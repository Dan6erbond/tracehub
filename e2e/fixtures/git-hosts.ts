import { z } from 'zod'

export const gitHostNameSchema = z.enum(['gitea', 'forgejo'])
export type GitHostName = z.infer<typeof gitHostNameSchema>
export const gitHostNames = gitHostNameSchema.options

/** The name of a host's provider template, as it shows in TraceHub. */
export const gitHostLabels: Record<GitHostName, string> = {
  gitea: 'Gitea',
  forgejo: 'Forgejo',
}

export const gitHostUser = (name: GitHostName) => ({
  username: 'alice',
  password: 'alice-e2e-password',
  email: `alice@${name}.test`,
})
