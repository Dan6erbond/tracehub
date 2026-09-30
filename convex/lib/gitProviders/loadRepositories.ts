import { authComponent, createAuth } from '../../auth'
import { getProviderAccessToken } from './getAccessToken'
import { gitProviders } from './index'
import type { ActionCtx } from '../../_generated/server'
import type { GitProvider, Repo } from '../../../src/lib/schemas/repo'

export interface LoadedRepositories {
  /** Providers that were fetched successfully; only these may be pruned on sync. */
  providers: Array<GitProvider>
  repos: Array<Repo>
}

/**
 * Fetches the current user's repositories from every Git provider they have a
 * linked account for. A failing provider is skipped so it can't wipe others.
 */
export async function loadRepositories(
  ctx: ActionCtx,
): Promise<LoadedRepositories> {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx)
  const accounts = await auth.api.listUserAccounts({ headers })
  const linked = new Set(accounts.map((account) => account.providerId))

  const entries = (
    Object.entries(gitProviders) as Array<
      [GitProvider, (typeof gitProviders)[GitProvider]]
    >
  ).filter(([, adapter]) => linked.has(adapter.authProviderId))

  const results = await Promise.allSettled(
    entries.map(async ([provider, adapter]) =>
      adapter.listRepositories(await getProviderAccessToken(ctx, provider)),
    ),
  )

  const loaded: LoadedRepositories = { providers: [], repos: [] }
  results.forEach((result, i) => {
    const [provider] = entries[i]
    if (result.status === 'fulfilled') {
      loaded.providers.push(provider)
      loaded.repos.push(...result.value)
    } else {
      console.error(`Loading ${provider} repositories failed`, result.reason)
    }
  })

  if (entries.length > 0 && loaded.providers.length === 0) {
    throw new Error('Could not load repositories from any Git provider')
  }
  return loaded
}
