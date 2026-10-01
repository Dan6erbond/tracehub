import { betterAuth } from 'better-auth/minimal'
import type { BetterAuthOptions } from 'better-auth/minimal'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { admin } from 'better-auth/plugins/admin'
import authConfig from './auth.config'
import { components } from './_generated/api'
import { env } from './_generated/server'
import {
  createProviderLoader,
  gitProvidersPlugin,
} from './lib/gitProviders/authPlugin'
import {
  cleanUpDeletedUser,
  createSignUpGates,
  gateSignUpRequest,
} from './lib/userHooks'
import authSchema from './betterAuth/schema'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  { local: { schema: authSchema } },
)

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const { gateUserCreation, gateAccountLinking } = createSignUpGates(ctx)
  const loadProviders = createProviderLoader(ctx)
  return {
    baseURL: env.SITE_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    // No mail sender exists, so addresses are not verified.
    emailAndPassword: { enabled: true },
    account: {
      accountLinking: {
        enabled: true,
        // A forge account's email often differs from the password account's.
        allowDifferentEmails: true,
        // Lets these providers link even when the host reports the email as unverified; `gateAccountLinking` keeps implicit linking to them.
        trustedProviders: async () =>
          (await loadProviders().catch(() => []))
            .filter(({ provider }) => provider.trustedForLinking)
            .map(({ provider }) => provider.slug),
      },
    },
    user: {
      additionalFields: {
        theme: { type: 'string', defaultValue: 'dark' },
      },
    },
    // Persisted so limits hold across the stateless Convex function instances.
    rateLimit: { storage: 'database' },
    hooks: { before: gateSignUpRequest(ctx) },
    databaseHooks: {
      user: {
        create: { before: gateUserCreation },
        delete: { after: cleanUpDeletedUser(ctx) },
      },
      account: { create: { before: gateAccountLinking } },
    },
    plugins: [
      admin(),
      gitProvidersPlugin(loadProviders),
      convex({ authConfig }),
    ],
  } satisfies BetterAuthOptions
}

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx))
