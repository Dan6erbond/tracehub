import { Link } from '@tanstack/react-router'
import { GitBranch } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'

/** Points the admin to the Git provider setup. */
export function ProviderSetupPrompt() {
  return (
    <Alert>
      <GitBranch />
      <AlertTitle>Set up a source control provider</AlertTitle>
      <AlertDescription className="gap-3">
        <p>
          Users browse the repositories of the Git hosts they sign in with, so
          connect a provider to make this instance useful.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/providers/new">Set up provider</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
