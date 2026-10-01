import { createLink } from '@tanstack/react-router'
import { cn } from '#/lib/utils'
import type { ComponentProps } from 'react'

/** Classes for a container that opens its `StretchedLink` wherever it is clicked; its other links stay clickable above it. */
export const stretchedContainerClass =
  'relative [&_a:not([data-stretched-link])]:relative [&_a:not([data-stretched-link])]:z-10'

export const StretchedLink = createLink(
  ({ className, ...props }: ComponentProps<'a'>) => (
    <a
      data-stretched-link
      className={cn('after:absolute after:inset-0', className)}
      {...props}
    />
  ),
)
