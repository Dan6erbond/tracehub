import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { authClient } from '#/lib/auth-client'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/_app/me')({
  component: MePage,
})

function useAccounts() {
  return useQuery({
    queryKey: ['auth', 'accounts'],
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts()
      if (error) throw new Error(error.message)
      return data
    },
  })
}

function MePage() {
  const { data: session } = authClient.useSession()
  const accounts = useAccounts()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{session?.user.name}</h1>
        <p className="text-muted-foreground">{session?.user.email}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Social connections</CardTitle>
          <CardDescription>
            Source control accounts linked to your TraceHub login.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {accounts.isPending && <Skeleton className="h-10 w-full" />}
          {accounts.isError && (
            <p className="text-sm text-destructive">{accounts.error.message}</p>
          )}
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
                Connected {new Date(account.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
