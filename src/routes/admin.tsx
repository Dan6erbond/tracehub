import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router'
import { AdminSidebar } from '#/components/admin-sidebar'
import { AppShell } from '#/components/app-shell'
import { ConvexAuthGate } from '#/components/convex-auth-gate'
import { useIsAdmin } from '#/hooks/use-viewer'
import { requireAdmin } from '#/lib/route-guards'

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context }) => requireAdmin(context),
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <ConvexAuthGate>
      <AdminShell />
    </ConvexAuthGate>
  )
}

// `beforeLoad` guards arrival; this follows the live role afterwards, e.g. when another admin revokes it.
function AdminShell() {
  if (!useIsAdmin()) return <Navigate to="/" />
  return (
    <AppShell sidebar={<AdminSidebar />}>
      <Outlet />
    </AppShell>
  )
}
