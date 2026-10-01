import { ErrorAlert } from '#/components/error-alert'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function RouteError({ error }: ErrorComponentProps) {
  return (
    <ErrorAlert
      error={error instanceof Error ? error : new Error(String(error))}
    />
  )
}
