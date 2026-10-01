import { z } from 'zod'
import { httpUrlSchema } from './url'

export const gitProviderSchema = z.enum(['github'])
export type GitProvider = z.infer<typeof gitProviderSchema>

export const repoSchema = z.object({
  provider: gitProviderSchema,
  externalId: z.string(),
  fullName: z.string(),
  owner: z.string(),
  name: z.string(),
  private: z.boolean(),
  htmlUrl: httpUrlSchema,
  description: z.string().optional(),
  defaultBranch: z.string().optional(),
  pushedAt: z.number().optional(),
})
export type Repo = z.infer<typeof repoSchema>
