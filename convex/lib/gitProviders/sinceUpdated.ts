import type { PullRequest } from '../../../src/lib/schemas/pull-request'

/** Passes on pages of pull requests, most recently updated first, up to the first one not updated since `since`. */
export async function* sinceUpdated(
  pages: AsyncIterable<Array<PullRequest>>,
  since?: number,
): AsyncGenerator<Array<PullRequest>> {
  for await (const pullRequests of pages) {
    const fresh =
      since === undefined
        ? pullRequests
        : pullRequests.filter((pr) => pr.updatedAt >= since)
    if (fresh.length > 0) yield fresh
    if (fresh.length < pullRequests.length) return
  }
}
