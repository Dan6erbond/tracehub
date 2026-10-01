import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { BackLink } from '#/components/back-link'
import { PageTitle } from '#/components/page-title'
import { CreateProviderForm } from '#/components/providers/create-provider-form'
import { TemplatePicker } from '#/components/providers/template-picker'
import { Card, CardContent } from '#/components/ui/card'
import { useCallbackBase } from '#/hooks/use-git-providers'
import { ensureQuery } from '#/lib/ensure-entity'
import { callbackBaseQueryOptions } from '#/lib/provider-queries'
import { findProviderTemplate } from '#/lib/schemas/git-provider'

export const Route = createFileRoute('/admin/providers/new')({
  validateSearch: z.object({ template: z.string().optional() }),
  loader: async ({ context: { queryClient } }) => {
    await ensureQuery(queryClient, callbackBaseQueryOptions)
  },
  component: NewProviderPage,
})

function NewProviderPage() {
  const { template: templateKey } = Route.useSearch()
  const template = templateKey ? findProviderTemplate(templateKey) : undefined
  const callbackBase = useCallbackBase()
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <BackLink to="/admin/providers">Git providers</BackLink>
      <PageTitle
        title={template ? `Add ${template.label}` : 'Add a Git provider'}
        description={
          template
            ? 'Create an OAuth app on the host, then enter its credentials here.'
            : 'Pick the kind of Git host to connect.'
        }
      />
      {template ? (
        <Card>
          <CardContent>
            <CreateProviderForm
              key={template.key}
              template={template}
              callbackBase={callbackBase}
              onCreated={() => void navigate({ to: '/admin/providers' })}
            />
          </CardContent>
        </Card>
      ) : (
        <TemplatePicker />
      )}
    </div>
  )
}
