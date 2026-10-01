import { useSuspenseQuery } from '@tanstack/react-query'
import { isAdminQueryOptions } from '#/lib/viewer-queries'

/** Expects a route guard to have ensured the query. */
export const useIsAdmin = () => useSuspenseQuery(isAdminQueryOptions).data
