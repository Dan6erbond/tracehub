import { cn } from '#/lib/utils'

export function InlineCode({
  className,
  ...props
}: React.ComponentProps<'code'>) {
  return (
    <code
      className={cn(
        'rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground',
        className,
      )}
      {...props}
    />
  )
}
