import { createFileRoute, redirect } from '@tanstack/react-router'
import { GitBranch } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.isAuthenticated) throw redirect({ to: '/' })
  },
  component: Login,
})

function Login() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">TraceHub</CardTitle>
          <CardDescription>
            Sign in with your source control account to browse Playwright
            traces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() =>
              void authClient.signIn.social({
                provider: 'github',
                callbackURL: '/',
              })
            }
          >
            <GitBranch />
            Redirect to source control
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
