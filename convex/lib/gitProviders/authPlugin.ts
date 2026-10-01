import { internal } from '../../_generated/api'
import { toOAuthProvider } from './oauth'
import type { BetterAuthPlugin } from 'better-auth'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from '../../_generated/dataModel'
import type { ProviderWithCredentials } from './types'

export type LoadProviders = () => Promise<Array<ProviderWithCredentials>>

/**
 * Reads the enabled providers once per auth instance, the first time something needs them.
 * Call sites without a Convex context (the component's `createApi`, the Better Auth CLI) get none.
 */
export const createProviderLoader = (
  ctx: GenericCtx<DataModel>,
): LoadProviders => {
  let loading: Promise<Array<ProviderWithCredentials>> | undefined
  return () => {
    loading ??=
      'runQuery' in ctx
        ? ctx.runQuery(internal.gitProviders.listEnabledWithSecrets, {})
        : Promise.resolve([])
    return loading
  }
}

/**
 * Registers the admin-managed providers as social providers, so Better Auth's own sign-in, callback, link-social and access-token routes serve them.
 * The provider list is read once per auth instance, which is created per request.
 */
export const gitProvidersPlugin = (load: LoadProviders) =>
  ({
    id: 'git-providers',
    init: async ({ socialProviders }) => {
      // Password sign-in must keep working when the providers cannot be read.
      const providers = await load().catch((error: unknown) => {
        console.error('Could not load the Git providers', error)
        return []
      })
      return {
        context: {
          socialProviders: [
            ...socialProviders,
            ...providers.map(({ provider, credentials }) =>
              toOAuthProvider(provider, credentials),
            ),
          ],
        },
      }
    },
  }) satisfies BetterAuthPlugin
