import { Link, createFileRoute } from '@tanstack/react-router'
import { GitBranch } from 'lucide-react'
import { z } from 'zod'
import { AuthCard } from '#/components/auth-card'
import { AuthErrorAlert } from '#/components/auth-error-alert'
import { ErrorAlert } from '#/components/error-alert'
import { SignInForm } from '#/components/sign-in-form'
import { Button } from '#/components/ui/button'
import { FieldSeparator } from '#/components/ui/field'
import { useSocialSignIn } from '#/hooks/use-auth'
import { usePublicProviders } from '#/hooks/use-git-providers'
import { usePublicInstance } from '#/hooks/use-instance'
import { ensureQuery } from '#/lib/ensure-entity'
import { publicProvidersQueryOptions } from '#/lib/provider-queries'
import { guestGuard } from '#/lib/route-guards'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ error: z.string().optional() }),
  beforeLoad: async ({ context }) => {
    await guestGuard(context)
  },
  loader: async ({ context: { queryClient } }) => {
    await ensureQuery(queryClient, publicProvidersQueryOptions)
  },
  component: Login,
})

function Login() {
  const { registrationEnabled } = usePublicInstance()
  const providers = usePublicProviders()
  const { error } = Route.useSearch()
  const socialSignIn = useSocialSignIn()
  return (
    <AuthCard
      title="TraceHub"
      description="Sign in to browse Playwright traces."
    >
      <AuthErrorAlert code={error} />
      <SignInForm />
      {providers.length > 0 && <FieldSeparator>or</FieldSeparator>}
      {providers.map(({ slug, name }) => (
        <Button
          key={slug}
          variant="outline"
          className="w-full"
          disabled={socialSignIn.isPending}
          onClick={() => socialSignIn.mutate(slug)}
        >
          <GitBranch />
          Sign in with {name}
        </Button>
      ))}
      <ErrorAlert error={socialSignIn.error} />
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
