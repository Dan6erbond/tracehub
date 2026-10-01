import { createFileRoute } from '@tanstack/react-router'
import { InstanceSettingsForm } from '#/components/instance-settings-form'
import { PageTitle } from '#/components/page-title'
import { ProviderSetupPrompt } from '#/components/provider-setup-prompt'
import { useAdminProviders } from '#/hooks/use-git-providers'
import { ensureQuery } from '#/lib/ensure-entity'
import { instanceSettingsQueryOptions } from '#/lib/instance-queries'
import { adminProvidersQueryOptions } from '#/lib/provider-queries'

export const Route = createFileRoute('/admin/settings')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      ensureQuery(queryClient, instanceSettingsQueryOptions),
      ensureQuery(queryClient, adminProvidersQueryOptions),
    ])
  },
  component: SettingsPage,
})

function SettingsPage() {
  const hasProviders = useAdminProviders().length > 0
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageTitle
        title="Settings"
        description="Instance-wide settings for TraceHub."
      />
      {!hasProviders && <ProviderSetupPrompt />}
      <InstanceSettingsForm />
    </div>
  )
}
