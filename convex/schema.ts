import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { zodToConvexFields } from 'convex-helpers/server/zod4'
import { repoSchema } from '../src/lib/schemas/repo'

export default defineSchema({
  repos: defineTable(zodToConvexFields(repoSchema.shape)).index(
    'by_provider_externalId',
    ['provider', 'externalId'],
  ),
  userRepos: defineTable({
    userId: v.string(),
    repoId: v.id('repos'),
    fullName: v.optional(v.string()),
  })
    .index('by_user_fullName', ['userId', 'fullName'])
    .index('by_repo', ['repoId'])
    .index('by_fullName', ['fullName'])
    .index('by_user_repo', ['userId', 'repoId']),
})
