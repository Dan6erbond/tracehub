import { InfiniteScrollTrigger } from '#/components/infinite-scroll-trigger'
import { Skeleton } from '#/components/ui/skeleton'
import type { PaginationStatus } from 'convex/react'
import type { ReactNode } from 'react'

/** A Convex paginated query: skeleton while the first page loads, `children` for the loaded results, `empty` when there are none, and infinite scrolling. */
export function PaginatedList<T>({
  query: { results, status, loadMore },
  pageSize,
  empty,
  skeletonClassName = 'h-32 w-full',
  children,
}: {
  query: {
    results: Array<T>
    status: PaginationStatus
    loadMore: (numItems: number) => void
  }
  pageSize: number
  empty?: ReactNode
  skeletonClassName?: string
  children: (results: Array<T>) => ReactNode
}) {
  if (status === 'LoadingFirstPage')
    return <Skeleton className={skeletonClassName} />

  return (
    <div className="flex flex-col gap-3">
      {results.length > 0 && children(results)}
      {status === 'Exhausted' && results.length === 0 && empty}
      {status !== 'Exhausted' && (
        <InfiniteScrollTrigger
          canLoadMore={status === 'CanLoadMore'}
          isLoading={status === 'LoadingMore'}
          onLoadMore={() => loadMore(pageSize)}
        />
      )}
    </div>
  )
}
