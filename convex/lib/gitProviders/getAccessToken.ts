import { authComponent, createAuth } from '../../auth'
import { gitProviders } from './index'
import type { ActionCtx } from '../../_generated/server'
import type { GitProvider } from '../../../src/lib/schemas/repo'

/** The current user's token for the account linked to `provider`; Better Auth refreshes it when expired. */
export async function getProviderAccessToken(
  ctx: ActionCtx,
  provider: GitProvider,
): Promise<string> {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx)
  const { accessToken } = await auth.api.getAccessToken({
    body: { providerId: gitProviders[provider].authProviderId },
    headers,
  })
  return accessToken
}
