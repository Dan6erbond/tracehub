import { internal } from '../../_generated/api'
import type { Doc, Id } from '../../_generated/dataModel'
import type { ActionCtx, MutationCtx, QueryCtx } from '../../_generated/server'
import type { ProviderConfig } from './types'

export const toProviderConfig = ({
  _id,
  slug,
  type,
  name,
  baseUrl,
  apiUrl,
  enabled,
}: Doc<'gitProviders'>): ProviderConfig => ({
  _id,
  slug,
  type,
  name,
  baseUrl,
  apiUrl,
  enabled,
})

type ProviderLoadingCtx = QueryCtx | MutationCtx | ActionCtx

export const loadProviderConfig = async (
  ctx: ProviderLoadingCtx,
  providerId: Id<'gitProviders'>,
): Promise<ProviderConfig | null> => {
  const provider: Doc<'gitProviders'> | null = await ctx.runQuery(
    internal.gitProviders.findById,
    { providerId },
  )
  return provider && toProviderConfig(provider)
}

/** For queries that map many repos: each provider is read once. */
export const providerLoader = (ctx: ProviderLoadingCtx) => {
  const loaded = new Map<Id<'gitProviders'>, Promise<ProviderConfig | null>>()
  return (providerId: Id<'gitProviders'>) => {
    let provider = loaded.get(providerId)
    if (!provider) {
      provider = loadProviderConfig(ctx, providerId)
      loaded.set(providerId, provider)
    }
    return provider
  }
}
