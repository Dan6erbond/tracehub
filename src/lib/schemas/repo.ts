import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod4'

export const repoSchema = z.object({
  providerId: zid('gitProviders'),
  externalId: z.string(),
  fullName: z.string(),
  owner: z.string(),
  name: z.string(),
  private: z.boolean(),
  description: z.string().optional(),
  defaultBranch: z.string().optional(),
  pushedAt: z.number().optional(),
})
export type Repo = z.infer<typeof repoSchema>
