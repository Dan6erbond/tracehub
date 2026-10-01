import { createFileRoute } from '@tanstack/react-router'
import { InstanceSettingsForm } from '#/components/instance-settings-form'
import { PageTitle } from '#/components/page-title'
import { ProviderSetupPrompt } from '#/components/provider-setup-prompt'
import { ensureQuery } from '#/lib/ensure-entity'
import { instanceSettingsQueryOptions } from '#/lib/instance-queries'

export const Route = createFileRoute('/admin/settings')({
  loader: async ({ context: { queryClient } }) => {
    await ensureQuery(queryClient, instanceSettingsQueryOptions)
  },
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageTitle
        title="Settings"
        description="Instance-wide settings for TraceHub."
      />
      <ProviderSetupPrompt />
      <InstanceSettingsForm />
    </div>
  )
}
