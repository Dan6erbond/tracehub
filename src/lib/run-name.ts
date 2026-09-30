import type { CiJob } from '#/lib/schemas/ci-job'
import type { CiPipeline } from '#/lib/schemas/ci-pipeline'
import type { Run } from '#/lib/schemas/run'

export const runName = ({
  title,
  job,
  pipeline,
  sha,
}: Pick<Run, 'title' | 'sha'> & {
  job: Pick<CiJob, 'name'> | null
  pipeline: Pick<CiPipeline, 'name' | 'externalId'> | null
}) =>
  title ??
  job?.name ??
  (pipeline
    ? `${pipeline.name} #${pipeline.externalId}`
    : `Upload ${sha.slice(0, 7)}`)
