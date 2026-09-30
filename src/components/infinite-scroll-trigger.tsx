import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

type Props = {
  canLoadMore: boolean
  isLoading: boolean
  onLoadMore: () => void
}

export function InfiniteScrollTrigger({
  canLoadMore,
  isLoading,
  onLoadMore,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !canLoadMore) return
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && onLoadMore(),
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [canLoadMore, onLoadMore])

  return (
    <div ref={ref} className="flex h-10 items-center justify-center">
      {isLoading && (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  )
}
