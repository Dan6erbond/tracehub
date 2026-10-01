import { createLink } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { ComponentProps } from 'react'

export const BackLink = createLink(
  ({ className, children, ...props }: ComponentProps<'a'>) => (
    <a
      className={cn(
        'flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground',
        className,
      )}
      {...props}
    >
      <ChevronLeft className="size-4" />
      {children}
    </a>
  ),
)
