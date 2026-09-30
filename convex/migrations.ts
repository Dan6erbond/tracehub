import { Migrations } from '@convex-dev/migrations'
import { components, internal } from './_generated/api'
import schema from './schema'
import { toHttpUrl } from '../src/lib/schemas/url'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

export const migrations = new Migrations(components.migrations, { schema })
export const run = migrations.runner()

export const backfillUserRepoFullName = migrations.define({
  table: 'userRepos',
  customRange: (query) =>
    query.withIndex('by_fullName', (q) => q.eq('fullName', undefined)),
  migrateOne: async (ctx, link) => {
    const repo = await ctx.db.get('repos', link.repoId)
    if (!repo) return ctx.db.delete('userRepos', link._id)
    return { fullName: repo.fullName }
  },
})

export const migrateJobPipelines = migrations.define({
  table: 'ciJobs',
  customRange: (query) =>
    query.withIndex('by_legacy_pipeline', (q) => q.gt('pipeline', undefined)),
  migrateOne: async (ctx, job): Promise<Partial<Doc<'ciJobs'>>> => {
    const pipeline: Doc<'ciPipelines'> | null =
      job.pipeline === undefined
        ? null
        : await ctx.runQuery(internal.ciPipelines.findByExternalId, {
            repoId: job.repoId,
            externalId: job.pipeline,
          })
    return {
      pipelineId: pipeline?._id,
      pipeline: undefined,
      trigger: undefined,
    }
  },
})

const migrateRunCi = async (
  ctx: MutationCtx,
  legacy: Doc<'runs'>,
): Promise<Partial<Doc<'runs'>>> => {
  const {
    pipelineId,
    jobId,
  }: {
    pipelineId: Id<'ciPipelines'> | undefined
    jobId: Id<'ciJobs'> | undefined
  } = await ctx.runMutation(internal.runs.resolveCi, {
    repoId: legacy.repoId,
    sha: legacy.sha,
    branch: legacy.branch,
    prNumber: legacy.prNumber,
    externalRunId: legacy.externalRunId,
    externalJobId: legacy.externalJobId,
    jobName: legacy.jobName,
    ciUrl: toHttpUrl(legacy.ciUrl),
  })
  return {
    pipelineId,
    jobId,
    externalRunId: undefined,
    externalJobId: undefined,
    jobName: undefined,
    ciUrl: undefined,
  }
}

// One range per legacy field: an index range cannot express "any of them is set", so each pass takes the
// runs whose first set field is the one it names; a pass clears the fields, which drops its runs from the later ranges.
export const migrateRunsByPipeline = migrations.define({
  table: 'runs',
  customRange: (query) =>
    query.withIndex('by_legacy_ci', (q) => q.gt('externalRunId', undefined)),
  migrateOne: migrateRunCi,
})

export const migrateRunsByJobId = migrations.define({
  table: 'runs',
  customRange: (query) =>
    query.withIndex('by_legacy_ci', (q) =>
      q.eq('externalRunId', undefined).gt('externalJobId', undefined),
    ),
  migrateOne: migrateRunCi,
})

export const migrateRunsByJobName = migrations.define({
  table: 'runs',
  customRange: (query) =>
    query.withIndex('by_legacy_ci', (q) =>
      q
        .eq('externalRunId', undefined)
        .eq('externalJobId', undefined)
        .gt('jobName', undefined),
    ),
  migrateOne: migrateRunCi,
})

// A run with only a CI URL names no pipeline or job to hold it, so the URL is dropped.
export const migrateRunsByCiUrl = migrations.define({
  table: 'runs',
  customRange: (query) =>
    query.withIndex('by_legacy_ci', (q) =>
      q
        .eq('externalRunId', undefined)
        .eq('externalJobId', undefined)
        .eq('jobName', undefined)
        .gt('ciUrl', undefined),
    ),
  migrateOne: () => ({ ciUrl: undefined }),
})

export const dropPullRequestUrl = migrations.define({
  table: 'pullRequests',
  migrateOne: (_ctx, pullRequest) =>
    pullRequest.htmlUrl === undefined ? undefined : { htmlUrl: undefined },
})

export const runAll = migrations.runner([
  internal.migrations.backfillUserRepoFullName,
  internal.migrations.migrateJobPipelines,
  internal.migrations.migrateRunsByPipeline,
  internal.migrations.migrateRunsByJobId,
  internal.migrations.migrateRunsByJobName,
  internal.migrations.migrateRunsByCiUrl,
  internal.migrations.dropPullRequestUrl,
])
