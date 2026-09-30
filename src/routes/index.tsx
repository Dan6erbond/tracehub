import { createFileRoute, redirect } from '@tanstack/react-router'
import BetterAuthHeader from '#/integrations/better-auth/header-user'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) throw redirect({ to: '/login' })
  },
  component: Home,
})

function Home() {
  return (
    <div className="flex items-center justify-between p-8">
      <h1 className="text-4xl font-bold">TraceHub</h1>
      <BetterAuthHeader />
    </div>
  )
}
