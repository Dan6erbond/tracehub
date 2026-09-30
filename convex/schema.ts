import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { zodToConvexFields } from 'convex-helpers/server/zod4'
import { branchSchema } from '../src/lib/schemas/branch'
import { ciJobSchema } from '../src/lib/schemas/ci-job'
import { ciPipelineSchema } from '../src/lib/schemas/ci-pipeline'
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
    // Last seen on the host; absent on branches created from an upload until a sync reports them.
    syncedAt: v.optional(v.number()),
    // Set when the host stopped listing a branch that runs still reference; the branch stays until they are gone.
    remoteDeletedAt: v.optional(v.number()),
    // The user who uploaded to the branch first; absent on branches created by a sync.
    createdBy: v.optional(v.string()),
  })
    .index('by_repo_name', ['repoId', 'name'])
    .index('by_repo_committedAt', ['repoId', 'committedAt'])
    .index('by_repo_remoteDeletedAt_syncedAt', [
      'repoId',
      'remoteDeletedAt',
      'syncedAt',
    ]),
  pullRequests: defineTable({
    repoId: v.id('repos'),
    ...zodToConvexFields(pullRequestSchema.shape),
    // Legacy: links are derived from the repo now. Dropped once migrations.dropPullRequestUrl has run everywhere.
    htmlUrl: v.optional(v.string()),
  })
    .index('by_repo_number', ['repoId', 'number'])
    .index('by_repo_updatedAt', ['repoId', 'updatedAt'])
    .index('by_repo_state_updatedAt', ['repoId', 'state', 'updatedAt'])
    .index('by_repo_head', ['repoId', 'fromFork', 'headBranch', 'state']),
  ciJobs: defineTable({
    repoId: v.id('repos'),
    ...zodToConvexFields(ciJobSchema.omit({ pipeline: true }).shape),
    pipelineId: v.optional(v.id('ciPipelines')),
    // Absent on jobs created from an upload until the host reports them.
    syncedAt: v.optional(v.number()),
    // Legacy: replaced by `pipelineId` and the pipeline's own trigger. Dropped once migrations.migrateJobPipelines has run everywhere.
    pipeline: v.optional(v.string()),
    trigger: v.optional(v.string()),
  })
    .index('by_repo_sha_externalId', ['repoId', 'sha', 'externalId'])
    .index('by_repo_sha_name', ['repoId', 'sha', 'name'])
    .index('by_pipeline', ['pipelineId', 'name'])
    .index('by_legacy_pipeline', ['pipeline']),
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
    // Legacy: uploads name their pipeline and job, which resolve to `pipelineId` and `jobId`. Dropped once the migrateRuns* migrations have run everywhere.
    externalRunId: v.optional(v.string()),
    externalJobId: v.optional(v.string()),
    jobName: v.optional(v.string()),
    ciUrl: v.optional(v.string()),
  })
    .index('by_repo_ci', ['repoId', 'sha', 'pipelineId', 'jobId'])
    .index('by_pipeline', ['pipelineId'])
    .index('by_job', ['jobId'])
    .index('by_repo_branch', ['repoId', 'branch', 'pinnedAt'])
    .index('by_repo_pr', ['repoId', 'prNumber', 'pinnedAt'])
    .index('by_legacy_ci', [
      'externalRunId',
      'externalJobId',
      'jobName',
      'ciUrl',
    ]),
  traces: defineTable({
    repoId: v.id('repos'),
    runId: v.id('runs'),
    // copied from the run (see traces.syncRunScope for when the run changes them) so aggregates can be keyed by them
    branch: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    ...zodToConvexFields(traceSchema.shape),
  })
    .index('by_run', ['runId'])
    .index('by_storageId', ['storageId']),
})
