import type { CiStatus } from '../../../src/lib/schemas/ci-status'

const PASSING_CONCLUSIONS = new Set(['SUCCESS', 'NEUTRAL', 'SKIPPED'])

/** Run and check states of GitHub and of the Actions API of Gitea, which mirrors it; GraphQL answers upper-case, REST lower-case. */
export const toCiStatus = (
  status?: string | null,
  conclusion?: string | null,
): CiStatus => {
  if (status?.toUpperCase() !== 'COMPLETED') return 'pending'
  return PASSING_CONCLUSIONS.has((conclusion ?? '').toUpperCase())
    ? 'success'
    : 'failure'
}

/** The status of a commit as a whole: failing once one of its contexts fails, else pending while one is; `undefined` without any context. */
export const combineStatuses = (
  statuses: ReadonlyArray<CiStatus>,
): CiStatus | undefined => {
  if (statuses.length === 0) return undefined
  if (statuses.includes('failure')) return 'failure'
  return statuses.includes('pending') ? 'pending' : 'success'
}
