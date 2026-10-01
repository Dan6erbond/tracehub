import { redirect } from '@tanstack/react-router'
import { ensureQuery } from '#/lib/ensure-entity'
import { publicInstanceQueryOptions } from '#/lib/instance-queries'
import { isAdminQueryOptions } from '#/lib/viewer-queries'
import type { QueryClient } from '@tanstack/react-query'

type GuardContext = { isAuthenticated: boolean; queryClient: QueryClient }

export const loadPublicInstance = (queryClient: QueryClient) =>
  ensureQuery(queryClient, publicInstanceQueryOptions)

export const requireAuth = ({ isAuthenticated }: GuardContext) => {
  if (!isAuthenticated) throw redirect({ to: '/login' })
}

/** Signed-in admins only; everyone else is sent home. */
export async function requireAdmin(context: GuardContext) {
  requireAuth(context)
  if (!(await ensureQuery(context.queryClient, isAdminQueryOptions)))
    throw redirect({ to: '/' })
}

/** For the pages of signed-out visitors: sends signed-in users home and an instance without users to its initial setup. Returns the instance's public state. */
export async function guestGuard({
  isAuthenticated,
  queryClient,
}: GuardContext) {
  if (isAuthenticated) throw redirect({ to: '/' })
  const instance = await loadPublicInstance(queryClient)
  if (instance.needsSetup) throw redirect({ to: '/initial-setup' })
  return instance
}
