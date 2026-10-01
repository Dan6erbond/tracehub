import { Card } from '#/components/ui/card'
import { stretchedContainerClass } from '#/components/stretched-link'
import { cn } from '#/lib/utils'
import type { ComponentProps } from 'react'

/** A card that opens its `StretchedLink` wherever it is clicked; other links in the card stay clickable above it. */
export function LinkCard({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        stretchedContainerClass,
        'transition-colors hover:bg-accent/50',
        className,
      )}
      {...props}
    />
  )
}
