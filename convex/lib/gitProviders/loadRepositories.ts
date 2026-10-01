import { internal } from '../../_generated/api'
import { createAdapter } from './index'
import { getAccessToken, getAuthSession } from './getAccessToken'
import { toProviderConfig } from './providerConfig'
import type { Doc, Id } from '../../_generated/dataModel'
import type { ActionCtx } from '../../_generated/server'
import type { Repo } from '../../../src/lib/schemas/repo'

export interface LoadedRepositories {
  /** Providers that were fetched successfully; only these may be pruned on sync. */
  providers: Array<Id<'gitProviders'>>
  repos: Array<Repo>
}

/**
 * Fetches the current user's repositories from every enabled Git provider. A provider the user has no linked account for
 * counts as loaded with no repos, so the links they still hold to its repos get pruned.
 * A failing provider is skipped so it can't wipe others.
 */
export async function loadRepositories(
  ctx: ActionCtx,
): Promise<LoadedRepositories> {
  const session = await getAuthSession(ctx)
  const [accounts, providerDocs]: [
    Array<{ providerId: string }>,
    Array<Doc<'gitProviders'>>,
  ] = await Promise.all([
    session.auth.api.listUserAccounts({ headers: session.headers }),
    ctx.runQuery(internal.gitProviders.listEnabled, {}),
  ])
  const linked = new Set(accounts.map((account) => account.providerId))

  const results = await Promise.allSettled(
    providerDocs.map(async (doc) => {
      const provider = toProviderConfig(doc)
      if (!linked.has(provider.slug)) return []
      return createAdapter(provider).listRepositories(
        await getAccessToken(session, provider),
      )
    }),
  )

  const loaded: LoadedRepositories = { providers: [], repos: [] }
  results.forEach((result, i) => {
    const { _id, slug } = providerDocs[i]
    if (result.status === 'fulfilled') {
      loaded.providers.push(_id)
      loaded.repos.push(...result.value)
    } else {
      console.error(`Loading ${slug} repositories failed`, result.reason)
    }
  })

  if (providerDocs.length > 0 && loaded.providers.length === 0) {
    throw new Error('Could not load repositories from any Git provider')
  }
  return loaded
}
