import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { BackLink } from '#/components/back-link'
import { NotFound } from '#/components/not-found'
import { PageTitle } from '#/components/page-title'
import { CallbackUrl } from '#/components/providers/callback-url'
import { EditProviderForm } from '#/components/providers/edit-provider-form'
import { RemoveProviderDialog } from '#/components/providers/remove-provider-dialog'
import { SetupGuide } from '#/components/providers/setup-guide'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { useCallbackBase, useGitProvider } from '#/hooks/use-git-providers'
import { createZodParams } from '#/lib/create-zod-params'
import { ensureEntity, ensureQuery } from '#/lib/ensure-entity'
import {
  callbackBaseQueryOptions,
  providerQueryOptions,
} from '#/lib/provider-queries'

export const Route = createFileRoute('/admin/providers/$providerId')({
  params: createZodParams(z.object({ providerId: zid('gitProviders') })),
  loader: async ({ context: { queryClient }, params: { providerId } }) => {
    await Promise.all([
      ensureEntity(queryClient, providerQueryOptions(providerId)),
      ensureQuery(queryClient, callbackBaseQueryOptions),
    ])
  },
  notFoundComponent: () => <NotFound entity="Provider" />,
  component: ProviderPage,
})

function ProviderPage() {
  const { providerId } = Route.useParams()
  const provider = useGitProvider(providerId)
  const callbackBase = useCallbackBase()
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <BackLink to="/admin/providers">Git providers</BackLink>
      <PageTitle title={provider.name} description={`Slug: ${provider.slug}`}>
        <Badge variant="secondary" className="capitalize">
          {provider.type}
        </Badge>
      </PageTitle>
      <Card>
        <CardContent className="flex flex-col gap-8">
          <CallbackUrl url={`${callbackBase}/${provider.slug}`} />
          <SetupGuide type={provider.type} baseUrl={provider.baseUrl} />
          <EditProviderForm provider={provider} />
        </CardContent>
      </Card>
      <div>
        <RemoveProviderDialog
          provider={provider}
          onRemoved={() => void navigate({ to: '/admin/providers' })}
        />
      </div>
    </div>
  )
}
