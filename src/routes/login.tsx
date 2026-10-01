import { Link, createFileRoute } from '@tanstack/react-router'
import { GitBranch } from 'lucide-react'
import { AuthCard } from '#/components/auth-card'
import { SignInForm } from '#/components/sign-in-form'
import { Button } from '#/components/ui/button'
import { FieldSeparator } from '#/components/ui/field'
import { usePublicInstance } from '#/hooks/use-instance'
import { authClient } from '#/lib/auth-client'
import { guestGuard } from '#/lib/route-guards'

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    await guestGuard(context)
  },
  component: Login,
})

function Login() {
  const { registrationEnabled } = usePublicInstance()
  return (
    <AuthCard
      title="TraceHub"
      description="Sign in to browse Playwright traces."
    >
      <SignInForm />
      <FieldSeparator>or</FieldSeparator>
      <Button
        variant="outline"
        className="w-full"
        onClick={() =>
          void authClient.signIn.social({
            provider: 'github',
            callbackURL: '/',
          })
        }
      >
        <GitBranch />
        Sign in with source control
      </Button>
      {registrationEnabled && (
        <p className="text-center text-sm text-muted-foreground">
          No account yet?{' '}
          <Link to="/sign-up" className="underline underline-offset-4">
            Sign up
          </Link>
        </p>
      )}
    </AuthCard>
  )
}
