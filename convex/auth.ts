import { betterAuth } from 'better-auth/minimal'
import type { BetterAuthOptions } from 'better-auth/minimal'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { admin } from 'better-auth/plugins/admin'
import authConfig from './auth.config'
import { components } from './_generated/api'
import { env } from './_generated/server'
import {
  cleanUpDeletedUser,
  gateSignUpRequest,
  gateUserCreation,
} from './lib/userHooks'
import authSchema from './betterAuth/schema'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  { local: { schema: authSchema } },
)

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    baseURL: env.SITE_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    // No mail sender exists, so addresses are not verified.
    emailAndPassword: { enabled: true },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        // `repo` is needed to list private repositories
        scope: ['repo'],
      },
    },
    account: {
      // A forge account's email often differs from the password account's.
      accountLinking: { enabled: true, allowDifferentEmails: true },
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
        create: { before: gateUserCreation(ctx) },
        delete: { after: cleanUpDeletedUser(ctx) },
      },
    },
    plugins: [admin(), convex({ authConfig })],
  }) satisfies BetterAuthOptions

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx))
