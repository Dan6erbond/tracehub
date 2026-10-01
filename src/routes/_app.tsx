import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppShell } from '#/components/app-shell'
import { AppSidebar } from '#/components/app-sidebar'
import { ConvexAuthGate } from '#/components/convex-auth-gate'
import { requireAuth } from '#/lib/route-guards'

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context }) => requireAuth(context),
  component: AppLayout,
})

function AppLayout() {
  return (
    <ConvexAuthGate>
      <AppShell sidebar={<AppSidebar />}>
        <Outlet />
      </AppShell>
    </ConvexAuthGate>
  )
}
