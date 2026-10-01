import { useSuspenseQuery } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { toNotFound } from '#/lib/ensure-entity'
import type { QueryKey, UseSuspenseQueryOptions } from '@tanstack/react-query'

/**
 * Reads a live Convex query that a route loader ensured (see `ensureEntity`), so it does not suspend on arrival.
 * If the entity or the repo access disappears afterwards, the nearest `notFoundComponent` takes over.
 */
export function useSuspenseEntity<T, TKey extends QueryKey>(
  options: UseSuspenseQueryOptions<T | null, Error, T | null, TKey>,
): T {
  let data
  try {
    ;({ data } = useSuspenseQuery(options))
  } catch (error) {
    throw toNotFound(error)
  }
  if (data === null) throw notFound()
  return data
}
