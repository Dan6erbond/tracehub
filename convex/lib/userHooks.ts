import { APIError, createAuthMiddleware } from 'better-auth/api'
import { internal } from '../_generated/api'
import { adminRole } from '../../src/lib/roles'
import type { DBAdapter } from 'better-auth'
import type { BetterAuthOptions } from 'better-auth/minimal'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from '../_generated/dataModel'
import type { InstanceSettings } from '../../src/lib/schemas/instance-settings'

type UserHooks = NonNullable<
  NonNullable<BetterAuthOptions['databaseHooks']>['user']
>
type UserCreateBefore = NonNullable<NonNullable<UserHooks['create']>['before']>
type UserDeleteAfter = NonNullable<NonNullable<UserHooks['delete']>['after']>

// Endpoint templates, as `context.path` holds them
const ADMIN_CREATE_USER_PATH = '/admin/create-user'
const SIGN_UP_EMAIL_PATH = '/sign-up/email'

const noUsersYet = async (adapter: DBAdapter) =>
  (await adapter.findMany({ model: 'user', limit: 1 })).length === 0

const assertRegistrationEnabled = async (ctx: GenericCtx<DataModel>) => {
  const { registrationEnabled }: InstanceSettings = await ctx.runQuery(
    internal.instance.findSettings,
    {},
  )
  if (!registrationEnabled)
    throw new APIError('FORBIDDEN', { message: 'Registration is disabled' })
}

/**
 * `databaseHooks.user.create.before`: the first user becomes admin, everyone after needs open registration.
 *
 * Hooks run in the app's Convex context (the HTTP action serving `/api/auth/*`, or the action or mutation that called `getAuth`), so app tables are readable through `ctx.runQuery`.
 * The component only executes the adapter's storage functions and never runs hooks, so there is no component context to degrade for.
 */
export const gateUserCreation =
  (ctx: GenericCtx<DataModel>): UserCreateBefore =>
  async (_user, context) => {
    if (!context)
      throw new APIError('INTERNAL_SERVER_ERROR', {
        message: 'Users can only be created through an auth endpoint',
      })
    if (await noUsersYet(context.context.adapter))
      return { data: { role: adminRole } }
    // The endpoint checks the caller's role itself.
    if (context.path === ADMIN_CREATE_USER_PATH) return
    // Phase 5: an OAuth callback of a provider with `allowSignUp` returns here, bypassing the toggle.
    await assertRegistrationEnabled(ctx)
  }

/**
 * Rejects `/sign-up/email` while registration is closed, before the endpoint can answer "email already registered" and reveal which addresses have accounts.
 * The user creation gate stays the authority; this only moves the refusal ahead of that answer.
 */
export const gateSignUpRequest = (ctx: GenericCtx<DataModel>) =>
  createAuthMiddleware(async (endpoint) => {
    if (
      endpoint.path !== SIGN_UP_EMAIL_PATH ||
      (await noUsersYet(endpoint.context.adapter))
    )
      return
    await assertRegistrationEnabled(ctx)
  })

/** `databaseHooks.user.delete.after`: removes the app rows that belong to the user, which Better Auth knows nothing about. */
export const cleanUpDeletedUser =
  (ctx: GenericCtx<DataModel>): UserDeleteAfter =>
  async (user) => {
    if (!('runMutation' in ctx))
      throw new Error('Users can only be deleted from a mutation or action')
    await ctx.runMutation(internal.users.removeUserData, { userId: user.id })
  }
