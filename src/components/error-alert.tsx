import { CircleAlert } from 'lucide-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import type { ReactNode } from 'react'

/** Shows nothing without an `error`; `children` replaces the error's message. */
export function ErrorAlert({
  error,
  children,
}: {
  error?: Error | null
  children?: ReactNode
}) {
  if (!error) return null
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>{children ?? error.message}</AlertDescription>
    </Alert>
  )
}
