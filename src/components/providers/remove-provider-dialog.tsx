import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import {
  useLinkedAccountSummary,
  useRemoveGitProvider,
} from '#/hooks/use-git-providers'
import type { GitProviderAdmin } from '#/lib/schemas/git-provider'

function LinkedAccountsWarning({ provider }: { provider: GitProviderAdmin }) {
  const { data } = useLinkedAccountSummary(provider._id)
  if (!data) return null
  if (data.count === 0)
    return (
      <AlertDialogDescription>
        No accounts are linked through it.
      </AlertDialogDescription>
    )
  const atLeast = data.more ? 'At least ' : ''
  return (
    <AlertDialogDescription className="flex flex-col gap-2">
      <span>
        {atLeast}
        {data.count} linked {data.count === 1 ? 'account is' : 'accounts are'}{' '}
        removed with it.
      </span>
      {data.strandedCount > 0 && (
        <span>
          {atLeast}
          {data.strandedCount}{' '}
          {data.strandedCount === 1 ? 'user has' : 'users have'} no other
          sign-in method and will be signed out
          {data.strandedEmails.length > 0 &&
            ` (${data.strandedEmails.join(', ')}${data.strandedCount > data.strandedEmails.length ? ', �' : ''})`}
          . Set a password for them under Users to keep their access.
        </span>
      )}
    </AlertDialogDescription>
  )
}

export function RemoveProviderDialog({
  provider,
  onRemoved,
}: {
  provider: GitProviderAdmin
  onRemoved: () => void
}) {
  const removeProvider = useRemoveGitProvider()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Remove provider</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {provider.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Users can no longer sign in with it. A provider whose repositories
            are already stored cannot be removed; disable it instead.
          </AlertDialogDescription>
          <LinkedAccountsWarning provider={provider} />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              removeProvider.mutate(
                { providerId: provider._id },
                { onSuccess: onRemoved },
              )
            }
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
