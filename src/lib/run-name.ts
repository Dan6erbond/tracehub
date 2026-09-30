import type { Run } from '#/lib/schemas/run'

export const runName = ({ title, externalRunId, sha }: Run) =>
  title ??
  (externalRunId ? `Pipeline ${externalRunId}` : `Upload ${sha.slice(0, 7)}`)
