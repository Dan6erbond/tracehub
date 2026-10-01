import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { zodToConvexFields } from 'convex-helpers/server/zod4'
import { branchSchema } from '../src/lib/schemas/branch'
import { storedCiJobSchema } from '../src/lib/schemas/ci-job'
import { ciPipelineSchema } from '../src/lib/schemas/ci-pipeline'
import { instanceSettingsSchema } from '../src/lib/schemas/instance-settings'
import { pullRequestSchema } from '../src/lib/schemas/pull-request'
import { reloadLockSchema } from '../src/lib/schemas/reload-lock'
import { repoSchema } from '../src/lib/schemas/repo'
import { runSchema } from '../src/lib/schemas/run'
import { traceSchema } from '../src/lib/schemas/trace'

export default defineSchema({
  // Singleton: at most one row, absent until an admin first saves the settings.
  instanceSettings: defineTable(
    zodToConvexFields(instanceSettingsSchema.shape),
  ),
  // Separate from repos and userRepos so lock writes never invalidate their queries.
  reloadLocks: defineTable(zodToConvexFields(reloadLockSchema.shape)).index(
    'by_key',
    ['key'],
  ),
  repos: defineTable(zodToConvexFields(repoSchema.shape)).index(
    'by_provider_externalId',
    ['provider', 'externalId'],
  ),
  userRepos: defineTable({
    userId: v.string(),
    repoId: v.id('repos'),
    fullName: v.string(),
    activityAt: v.number(),
    // Last reload that listed the repo for the user; links the host stopped listing fall behind it.
    syncedAt: v.number(),
  })
    .index('by_user_activityAt', ['userId', 'activityAt'])
    .index('by_user_syncedAt', ['userId', 'syncedAt'])
    .searchIndex('search_fullName', {
      searchField: 'fullName',
      filterFields: ['userId'],
    })
    .index('by_repo', ['repoId'])
    .index('by_user_repo', ['userId', 'repoId']),
  branches: defineTable({
    repoId: v.id('repos'),
    ...zodToConvexFields(branchSchema.shape),
    // Last seen on the host; absent on branches created from an upload until a sync reports them.
    syncedAt: v.optional(v.number()),
    // Set when the host stopped listing a branch that runs still reference; the branch stays until they are gone.
    remoteDeletedAt: v.optional(v.number()),
    // The user who uploaded to the branch first; absent on branches created by a sync.
    createdBy: v.optional(v.string()),
  })
    .index('by_repo_name', ['repoId', 'name'])
    .index('by_repo_committedAt', ['repoId', 'committedAt'])
    .index('by_repo_remoteDeletedAt_committedAt', [
      'repoId',
      'remoteDeletedAt',
      'committedAt',
    ])
    .index('by_repo_remoteDeletedAt_syncedAt', [
      'repoId',
      'remoteDeletedAt',
      'syncedAt',
    ]),
  pullRequests: defineTable({
    repoId: v.id('repos'),
    ...zodToConvexFields(pullRequestSchema.shape),
  })
    .index('by_repo_number', ['repoId', 'number'])
    .index('by_repo_updatedAt', ['repoId', 'updatedAt'])
    .index('by_repo_closedAt_updatedAt', ['repoId', 'closedAt', 'updatedAt'])
    .index('by_repo_head', ['repoId', 'fromFork', 'headBranch', 'closedAt']),
  ciJobs: defineTable({
    repoId: v.id('repos'),
    ...zodToConvexFields(storedCiJobSchema.shape),
    pipelineId: v.optional(v.id('ciPipelines')),
    // Absent on jobs created from an upload until the host reports them.
    syncedAt: v.optional(v.number()),
  })
    .index('by_repo_sha_externalId', ['repoId', 'sha', 'externalId'])
    .index('by_repo_sha_name', ['repoId', 'sha', 'name'])
    .index('by_pipeline', ['pipelineId', 'name'])
    .index('by_pipeline_externalId', ['pipelineId', 'externalId']),
  ciPipelines: defineTable({
    repoId: v.id('repos'),
    ...zodToConvexFields(ciPipelineSchema.shape),
  })
    .index('by_repo_externalId', ['repoId', 'externalId'])
    .index('by_repo_startedAt', ['repoId', 'startedAt'])
    .index('by_repo_branch', ['repoId', 'branch', 'startedAt'])
    .index('by_repo_pr', ['repoId', 'prNumber', 'startedAt']),
  runs: defineTable({
    repoId: v.id('repos'),
    ...zodToConvexFields(runSchema.shape),
    createdBy: v.string(),
  })
    .index('by_repo_ci', ['repoId', 'sha', 'pipelineId', 'jobId'])
    .index('by_pipeline', ['pipelineId'])
    .index('by_job', ['jobId'])
    .index('by_repo_branch', ['repoId', 'branch', 'pinnedAt'])
    .index('by_repo_pr', ['repoId', 'prNumber', 'pinnedAt']),
  traces: defineTable({
    repoId: v.id('repos'),
    runId: v.id('runs'),
    // copied from the run (see traces.syncRunScope for when the run changes them) so aggregates can be keyed by them
    branch: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    pipelineId: v.optional(v.id('ciPipelines')),
    ...zodToConvexFields(traceSchema.shape),
  })
    .index('by_run', ['runId'])
    .index('by_storageId', ['storageId']),
})
