import type { ReactNode } from 'react'

export function PageTitle({
  title,
  description,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {children}
      </div>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  )
}
