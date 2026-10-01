import { authComponent, createAuth } from '../../auth'
import type { ActionCtx } from '../../_generated/server'
import type { ProviderConfig } from './types'

export type AuthSession = Awaited<ReturnType<typeof getAuthSession>>

export const getAuthSession = (ctx: ActionCtx) =>
  authComponent.getAuth(createAuth, ctx)

/** The current user's token for the account linked to `provider`; Better Auth refreshes it when expired. */
export async function getAccessToken(
  { auth, headers }: AuthSession,
  { slug }: Pick<ProviderConfig, 'slug'>,
): Promise<string> {
  const { accessToken } = await auth.api.getAccessToken({
    body: { providerId: slug },
    headers,
  })
  return accessToken
}

export async function getProviderAccessToken(
  ctx: ActionCtx,
  provider: Pick<ProviderConfig, 'slug'>,
): Promise<string> {
  return getAccessToken(await getAuthSession(ctx), provider)
}
