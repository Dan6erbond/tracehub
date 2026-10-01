import { cn } from '#/lib/utils'
import type { ReactNode } from 'react'

export function SectionHeading({
  subtle,
  className,
  children,
}: {
  subtle?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <h3
      className={cn(
        subtle
          ? 'text-sm font-medium text-muted-foreground'
          : 'text-lg font-semibold',
        className,
      )}
    >
      {children}
    </h3>
  )
}
