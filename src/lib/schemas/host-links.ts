import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod4'
import { repoSchema } from './repo'

/** A repo as queries return it: the stored fields plus where it lives on its Git host. */
export const repoViewSchema = repoSchema.omit({ htmlUrl: true }).extend({
  _id: zid('repos'),
  _creationTime: z.number(),
  url: z.string(),
  providerLabel: z.string(),
})
export type RepoView = z.infer<typeof repoViewSchema>

/** Page of the Git host that an entity (branch, pull request) has. */
export const hostPageSchema = z.object({ url: z.string() })
export type HostPage = z.infer<typeof hostPageSchema>

/** Page of the CI an entity (pipeline, job) has; absent when the CI has no page for it. */
export const ciPageSchema = z.object({ url: z.string().optional() })
export type CiPage = z.infer<typeof ciPageSchema>

/** Link to the commit an entity shows. */
export const commitLinkSchema = z.object({ commitUrl: z.string() })
export type CommitLink = z.infer<typeof commitLinkSchema>

/** The CI page of a run: its job's, else its pipeline's. */
export const runCiLinkSchema = z.object({ ciUrl: z.string().optional() })
export type RunCiLink = z.infer<typeof runCiLinkSchema>
