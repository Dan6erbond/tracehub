import type { Run } from '#/lib/schemas/run'

export const runName = ({ title, jobName, externalRunId, sha }: Run) =>
  title ??
  jobName ??
  (externalRunId ? `Pipeline ${externalRunId}` : `Upload ${sha.slice(0, 7)}`)
