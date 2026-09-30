import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
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

function AppLayout() {
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
