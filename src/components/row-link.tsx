import { TableRow } from '#/components/ui/table'
import { stretchedContainerClass } from '#/components/stretched-link'
import { cn } from '#/lib/utils'
import type { ComponentProps } from 'react'

/** A table row that opens its `StretchedLink` wherever it is clicked; other links in the row stay clickable above it. */
export function LinkRow({
  className,
  ...props
}: ComponentProps<typeof TableRow>) {
  return (
    <TableRow className={cn(stretchedContainerClass, className)} {...props} />
  )
}
