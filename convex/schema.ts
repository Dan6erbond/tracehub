import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { zodToConvexFields } from 'convex-helpers/server/zod4'
import { branchSchema } from '../src/lib/schemas/branch'
import { ciJobSchema } from '../src/lib/schemas/ci-job'
import { pullRequestSchema } from '../src/lib/schemas/pull-request'
import { repoSchema } from '../src/lib/schemas/repo'
import { runSchema } from '../src/lib/schemas/run'
import { traceSchema } from '../src/lib/schemas/trace'

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
    .index('by_repo_state_updatedAt', ['repoId', 'state', 'updatedAt'])
    .index('by_repo_head', ['repoId', 'fromFork', 'headBranch', 'state']),
  ciJobs: defineTable({
    repoId: v.id('repos'),
    ...zodToConvexFields(ciJobSchema.shape),
    syncedAt: v.number(),
  }).index('by_repo_sha_externalId', ['repoId', 'sha', 'externalId']),
  runs: defineTable({
    repoId: v.id('repos'),
    ...zodToConvexFields(runSchema.shape),
    createdBy: v.string(),
  })
    .index('by_repo_identity', [
      'repoId',
      'sha',
      'externalRunId',
      'externalJobId',
    ])
    .index('by_repo_branch', ['repoId', 'branch', 'pinnedAt'])
    .index('by_repo_pr', ['repoId', 'prNumber', 'pinnedAt']),
  traces: defineTable({
    repoId: v.id('repos'),
    runId: v.id('runs'),
    // copied from the run so aggregates can be keyed by them; a run's identity never changes
    branch: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    ...zodToConvexFields(traceSchema.shape),
  }).index('by_run', ['runId']),
})
