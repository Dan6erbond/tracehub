import { createLink } from '@tanstack/react-router'
import { TableRow } from '#/components/ui/table'
import { cn } from '#/lib/utils'
import type { ComponentProps } from 'react'

/** A table row that opens its `RowLink` wherever it is clicked; other links in the row stay clickable above it. */
export function LinkRow({
  className,
  ...props
}: ComponentProps<typeof TableRow>) {
  return (
    <TableRow
      className={cn(
        'relative [&_a:not([data-row-link])]:relative [&_a:not([data-row-link])]:z-10',
        className,
      )}
      {...props}
    />
  )
}

export const RowLink = createLink(
  ({ className, ...props }: ComponentProps<'a'>) => (
    <a
      data-row-link
      className={cn('after:absolute after:inset-0', className)}
      {...props}
    />
  ),
)
