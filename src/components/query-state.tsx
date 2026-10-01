import { ErrorAlert } from '#/components/error-alert'
import { Skeleton } from '#/components/ui/skeleton'
import type { ReactNode } from 'react'

/** Shows a skeleton while loading, the error if the query failed and `notFound` for a `null` result; renders `children` with the data otherwise. */
export function QueryState<T>({
  query: { data, isPending, error },
  notFound,
  children,
}: {
  query: {
    data: T | null | undefined
    isPending: boolean
    error?: Error | null
  }
  notFound: string
  children: (data: T) => ReactNode
}) {
  if (isPending) return <Skeleton className="h-10 w-64" />
  if (error) return <ErrorAlert error={error} />
  if (data === null) return <p className="text-muted-foreground">{notFound}</p>
  return data === undefined ? null : children(data)
}
