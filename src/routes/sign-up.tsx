import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { AuthCard } from '#/components/auth-card'
import { SignUpForm } from '#/components/sign-up-form'
import { guestGuard } from '#/lib/route-guards'

export const Route = createFileRoute('/sign-up')({
  beforeLoad: async ({ context }) => {
    const { registrationEnabled } = await guestGuard(context)
    if (!registrationEnabled) throw redirect({ to: '/login' })
  },
  component: SignUp,
})

function SignUp() {
  return (
    <AuthCard title="Create account" description="Sign up to browse traces.">
      <SignUpForm submitLabel="Sign up" redirectTo="/" />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
