import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { PageTitle } from '#/components/page-title'
import { ProvidersTable } from '#/components/providers/providers-table'
import { Button } from '#/components/ui/button'
import { useAdminProviders } from '#/hooks/use-git-providers'
import { ensureQuery } from '#/lib/ensure-entity'
import { adminProvidersQueryOptions } from '#/lib/provider-queries'

export const Route = createFileRoute('/admin/providers/')({
  loader: async ({ context: { queryClient } }) => {
    await ensureQuery(queryClient, adminProvidersQueryOptions)
  },
  component: ProvidersPage,
})

function ProvidersPage() {
  const providers = useAdminProviders()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <PageTitle
          title="Git providers"
          description="The Git hosts users sign in with and load repositories from."
        />
        <Button asChild>
          <Link to="/admin/providers/new">
            <Plus />
            Add provider
          </Link>
        </Button>
      </div>
      {providers.length === 0 ? (
        <p className="text-muted-foreground">No providers yet.</p>
      ) : (
        <ProvidersTable providers={providers} />
      )}
    </div>
  )
}
