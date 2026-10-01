import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import type { ReactNode } from 'react'

/**
 * Renders its children once Convex itself is authenticated. A route's `beforeLoad` only checks the server-side session,
 * but Convex authenticates the websocket separately and asynchronously (and drops auth on sign-out or token expiry),
 * so children must not mount queries before then.
 */
export function ConvexAuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) void navigate({ to: '/login' })
  }, [isLoading, isAuthenticated, navigate])

  return isAuthenticated ? children : null
}
