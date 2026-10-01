import { ErrorAlert } from '#/components/error-alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { formatDate } from '#/lib/format'
import type { useLinkedAccounts } from '#/hooks/use-accounts'

/** The accounts a user signs in with, and the enabled Git providers they can still connect. */
export function LinkedAccountsCard({
  accounts,
  isPending,
  error,
  connectable,
  link,
  unlink,
}: ReturnType<typeof useLinkedAccounts>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign-in methods</CardTitle>
        <CardDescription>
          Your password and the source control accounts linked to your TraceHub
          login.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isPending && <Skeleton className="h-10 w-full" />}
        <ErrorAlert error={error} />
        {accounts?.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{account.name}</Badge>
              {!account.isPassword && (
                <span className="text-sm text-muted-foreground">
                  {account.accountId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Connected {formatDate(account.createdAt)}
              </span>
              {!account.isPassword && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unlink.isPending}
                  onClick={() =>
                    unlink.mutate({
                      providerId: account.providerId,
                      accountId: account.accountId,
                    })
                  }
                >
                  Unlink
                </Button>
              )}
            </div>
          </div>
        ))}
        <ErrorAlert error={unlink.error} />
        {connectable.map(({ slug, name }) => (
          <Button
            key={slug}
            variant="outline"
            className="w-fit"
            disabled={link.isPending}
            onClick={() => link.mutate(slug)}
          >
            Connect {name}
          </Button>
        ))}
        <ErrorAlert error={link.error} />
      </CardContent>
    </Card>
  )
}
