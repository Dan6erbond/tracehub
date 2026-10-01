import { cn } from '#/lib/utils'
import type { ReactNode } from 'react'

/** Title row (with badges and right-aligned actions) over a muted meta row; `children` follow the meta row. */
export function PageHeader({
  title,
  compact,
  badges,
  actions,
  meta,
  children,
}: {
  title: ReactNode
  compact?: boolean
  badges?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-2 font-semibold',
            compact ? 'text-lg' : 'text-xl',
          )}
        >
          {title}
        </h2>
        {badges}
        {actions && (
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        )}
      </div>
      {meta && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {meta}
        </div>
      )}
      {children}
    </div>
  )
}
