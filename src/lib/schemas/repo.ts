import { z } from 'zod'

export const gitProviderSchema = z.enum(['github'])
export type GitProvider = z.infer<typeof gitProviderSchema>

export const repoSchema = z.object({
  provider: gitProviderSchema,
  externalId: z.string(),
  fullName: z.string(),
  owner: z.string(),
  name: z.string(),
  private: z.boolean(),
  htmlUrl: z.string(),
  description: z.string().optional(),
  defaultBranch: z.string().optional(),
})
export type Repo = z.infer<typeof repoSchema>
