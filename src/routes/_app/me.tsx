import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthErrorAlert } from '#/components/auth-error-alert'
import { LinkedAccountsCard } from '#/components/linked-accounts-card'
import { PageTitle } from '#/components/page-title'
import { useLinkedAccounts } from '#/hooks/use-accounts'
import { authClient } from '#/lib/auth-client'
import { ensureQuery } from '#/lib/ensure-entity'
import { publicProvidersQueryOptions } from '#/lib/provider-queries'

export const Route = createFileRoute('/_app/me')({
  validateSearch: z.object({ error: z.string().optional() }),
  loader: async ({ context: { queryClient } }) => {
    await ensureQuery(queryClient, publicProvidersQueryOptions)
  },
  component: MePage,
})

function MePage() {
  const { data: session } = authClient.useSession()
  const { error } = Route.useSearch()
  const linkedAccounts = useLinkedAccounts()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageTitle title={session?.user.name} description={session?.user.email} />
      <AuthErrorAlert code={error} />
      <LinkedAccountsCard {...linkedAccounts} />
    </div>
  )
}
