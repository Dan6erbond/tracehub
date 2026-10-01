import { createFileRoute } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { ErrorAlert } from '#/components/error-alert'
import { PageTitle } from '#/components/page-title'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { useAccounts } from '#/hooks/use-accounts'
import { formatDate } from '#/lib/format'

export const Route = createFileRoute('/_app/me')({
  component: MePage,
})

function MePage() {
  const { data: session } = authClient.useSession()
  const accounts = useAccounts()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageTitle title={session?.user.name} description={session?.user.email} />
      <Card>
        <CardHeader>
          <CardTitle>Social connections</CardTitle>
          <CardDescription>
            Source control accounts linked to your TraceHub login.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {accounts.isPending && <Skeleton className="h-10 w-full" />}
          <ErrorAlert error={accounts.error} />
          {accounts.data?.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {account.providerId}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {account.accountId}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                Connected {formatDate(account.createdAt)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
