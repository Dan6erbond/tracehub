import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { zodToConvexFields } from 'convex-helpers/server/zod4'
import { branchSchema } from '../src/lib/schemas/branch'
import { pullRequestSchema } from '../src/lib/schemas/pull-request'
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
    activityAt: v.optional(v.number()),
  })
    .index('by_user_activityAt', ['userId', 'activityAt'])
    .searchIndex('search_fullName', {
      searchField: 'fullName',
      filterFields: ['userId'],
    })
    .index('by_repo', ['repoId'])
    .index('by_fullName', ['fullName'])
    .index('by_user_repo', ['userId', 'repoId']),
  branches: defineTable({
    repoId: v.id('repos'),
    ...zodToConvexFields(branchSchema.shape),
    syncedAt: v.number(),
  })
    .index('by_repo_name', ['repoId', 'name'])
    .index('by_repo_committedAt', ['repoId', 'committedAt'])
    .index('by_repo_syncedAt', ['repoId', 'syncedAt']),
  pullRequests: defineTable({
    repoId: v.id('repos'),
    ...zodToConvexFields(pullRequestSchema.shape),
  })
    .index('by_repo_number', ['repoId', 'number'])
    .index('by_repo_updatedAt', ['repoId', 'updatedAt'])
    .index('by_repo_head', ['repoId', 'fromFork', 'headBranch', 'state']),
})
