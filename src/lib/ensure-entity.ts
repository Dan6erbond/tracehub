import { notFound } from '@tanstack/react-router'
import { ConvexError } from 'convex/values'
import { errorCodes } from '#/lib/errors'
import type {
  QueryClient,
  QueryExecuteOptions,
  QueryKey,
} from '@tanstack/react-query'

/** Turns the error of a repo-scoped query for an inaccessible repo into a not-found of the repo layout route, which renders "Repository not found"; any other error is returned unchanged. */
export function toNotFound(error: unknown): unknown {
  return error instanceof ConvexError &&
    (error.data as { code?: unknown } | null)?.code === errorCodes.repoNotFound
    ? notFound({ routeId: '/_app/repos/$repoId' })
    : error
}

/** Resolves a query from the cache when present, else fetches it; the `ConvexQueryClient` keeps the cached value live afterwards. */
export const ensureQuery = <T, TKey extends QueryKey>(
  queryClient: QueryClient,
  options: QueryExecuteOptions<T, Error, T, T, TKey>,
) => queryClient.query({ ...options, staleTime: 'static' })

/**
 * Route loader helper: ensures a Convex query is cached (and therefore live) and throws `notFound()` when the entity does not exist or its repo is not accessible.
 * Other failures propagate to the route's error component. Loaders should not return the entity, since components read the live value from the cache.
 */
export async function ensureEntity<T, TKey extends QueryKey>(
  queryClient: QueryClient,
  options: QueryExecuteOptions<T | null, Error, T | null, T | null, TKey>,
): Promise<T> {
  const entity = await ensureQuery(queryClient, options).catch(
    (error: unknown) => {
      throw toNotFound(error)
    },
  )
  if (entity === null) throw notFound()
  return entity
}
