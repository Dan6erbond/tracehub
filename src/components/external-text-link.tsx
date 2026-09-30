import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'

/** Links out when an `href` is known: around `children` if given, else as a bare icon; plain text otherwise. */
export function ExternalTextLink({
  href,
  children,
}: {
  href?: string
  children?: ReactNode
}) {
  if (!href) return <>{children}</>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={children ? undefined : 'Open in CI'}
      className="inline-flex items-center gap-1 hover:underline"
    >
      {children}
      <ExternalLink className="size-3 text-muted-foreground" />
    </a>
  )
}
