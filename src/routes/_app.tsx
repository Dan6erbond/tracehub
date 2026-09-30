import { useEffect } from 'react'
import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { AppSidebar } from '#/components/app-sidebar'
import { Separator } from '#/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

// beforeLoad only checks the server-side session. Convex authenticates the
// websocket separately and asynchronously (and drops auth on sign-out or token
// expiry), so children must not mount queries until Convex itself is authed.
function AppLayout() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) void navigate({ to: '/login' })
  }, [isLoading, isAuthenticated, navigate])

  if (!isAuthenticated) return null

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
