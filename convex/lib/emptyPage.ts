import type { PaginationResult } from 'convex/server'

export const EMPTY_PAGE: PaginationResult<never> = {
  page: [],
  isDone: true,
  continueCursor: '',
}
