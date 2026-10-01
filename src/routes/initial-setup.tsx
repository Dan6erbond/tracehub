import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthCard } from '#/components/auth-card'
import { SignUpForm } from '#/components/sign-up-form'
import { loadPublicInstance } from '#/lib/route-guards'

export const Route = createFileRoute('/initial-setup')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const { needsSetup } = await loadPublicInstance(queryClient)
    if (!needsSetup) throw redirect({ to: '/login' })
  },
  component: InitialSetup,
})

function InitialSetup() {
  return (
    <AuthCard
      title="Set up TraceHub"
      description="You are registering this instance. The account you create here becomes its admin, who manages users and settings."
    >
      <SignUpForm
        submitLabel="Create admin account"
        redirectTo="/admin/settings"
      />
    </AuthCard>
  )
}
