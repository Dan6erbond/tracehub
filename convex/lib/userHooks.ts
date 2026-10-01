import { APIError, createAuthMiddleware, getOAuthState } from 'better-auth/api'
import { internal } from '../_generated/api'
import { adminRole } from '../../src/lib/roles'
import type { DBAdapter } from 'better-auth'
import type { BetterAuthOptions } from 'better-auth/minimal'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel, Doc } from '../_generated/dataModel'
import type { InstanceSettings } from '../../src/lib/schemas/instance-settings'

type UserHooks = NonNullable<
  NonNullable<BetterAuthOptions['databaseHooks']>['user']
>
type UserCreateBefore = NonNullable<NonNullable<UserHooks['create']>['before']>
type UserDeleteAfter = NonNullable<NonNullable<UserHooks['delete']>['after']>
type AccountHooks = NonNullable<
  NonNullable<BetterAuthOptions['databaseHooks']>['account']
>
type AccountCreateBefore = NonNullable<
  NonNullable<AccountHooks['create']>['before']
>

// Endpoint templates, as `context.path` holds them
const ADMIN_CREATE_USER_PATH = '/admin/create-user'
const SIGN_UP_EMAIL_PATH = '/sign-up/email'
const OAUTH_CALLBACK_PATH = '/callback/:id'

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

const providerAllowsSignUp = async (
  ctx: GenericCtx<DataModel>,
  slug: string,
) => {
  const provider: Doc<'gitProviders'> | null = await ctx.runQuery(
    internal.gitProviders.findBySlug,
    { slug },
  )
  return provider?.enabled === true && provider.allowSignUp
}

/**
 * The gates on creating users and accounts. They share the set of requests that create a user, so call this once per auth instance (requests do not share one).
 * `after` hooks only run once the whole request is done, which is too late for the account hook, so the requests creating a user are recorded from the `before` hook, by their endpoint context.
 */
export const createSignUpGates = (ctx: GenericCtx<DataModel>) => {
  const requestsCreatingUser = new WeakSet<object>()

  /**
   * `databaseHooks.user.create.before`: the first user becomes admin, everyone after needs open registration.
   * A provider with `allowSignUp` bypasses the toggle; this runs here rather than through the provider's `disableImplicitSignUp`,
   * which the client lifts with `requestSignUp` and which could not express the toggle anyway.
   * Through an OAuth callback only an address the Git host reports as verified may register, so nobody can squat on an address they do not own.
   *
   * Hooks run in the app's Convex context (the HTTP action serving `/api/auth/*`, or the action or mutation that called `getAuth`), so app tables are readable through `ctx.runQuery`.
   * The component only executes the adapter's storage functions and never runs hooks, so there is no component context to degrade for.
   */
  const gateUserCreation: UserCreateBefore = async (user, context) => {
    if (!context)
      throw new APIError('INTERNAL_SERVER_ERROR', {
        message: 'Users can only be created through an auth endpoint',
      })
    const callbackSlug =
      context.path === OAUTH_CALLBACK_PATH ? context.params?.id : undefined
    if (callbackSlug !== undefined && !user.emailVerified)
      throw new APIError('FORBIDDEN', { message: 'Email not verified' })
    requestsCreatingUser.add(context)
    if (await noUsersYet(context.context.adapter))
      return { data: { role: adminRole } }
    // The endpoint checks the caller's role itself.
    if (context.path === ADMIN_CREATE_USER_PATH) return
    if (callbackSlug && (await providerAllowsSignUp(ctx, callbackSlug))) return
    await assertRegistrationEnabled(ctx)
  }

  /**
   * `databaseHooks.account.create.before`: on the OAuth callback (sign-in, sign-up and explicit link alike), the provider must still exist and be enabled,
   * so a callback that was already running when an admin disabled or removed the provider cannot attach an account to it.
   *
   * A provider that is not `trustedForLinking` also cannot attach itself to an existing user by matching their email (implicit linking),
   * which would let a host that does not verify emails take over an account. Better Auth's own settings cannot express this per provider.
   * The callback creates accounts in three situations: for a user the same request just created, for an explicit `linkSocial`
   * (the state carries `link`), and for implicit linking, the only one refused. A throw makes the sign-in fail; returning `false` would
   * skip the link but still sign the user in.
   */
  const gateAccountLinking: AccountCreateBefore = async (account, context) => {
    if (context?.path !== OAUTH_CALLBACK_PATH) return
    const provider: Doc<'gitProviders'> | null = await ctx.runQuery(
      internal.gitProviders.findBySlug,
      { slug: account.providerId },
    )
    if (!provider?.enabled)
      throw new APIError('FORBIDDEN', {
        message: 'This provider is no longer available',
      })
    if (requestsCreatingUser.has(context) || (await getOAuthState())?.link)
      return
    if (!provider.trustedForLinking)
      throw new APIError('FORBIDDEN', {
        message:
          'This provider cannot be linked by signing in. Connect it on your profile page instead',
      })
  }

  return { gateUserCreation, gateAccountLinking }
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

/** `databaseHooks.user.delete.after`: removes the app rows that belong to the user, which Better Auth knows nothing about. A failure is logged, not thrown, so the deletion itself stands. */
export const cleanUpDeletedUser =
  (ctx: GenericCtx<DataModel>): UserDeleteAfter =>
  async (user) => {
    try {
      if (!('runMutation' in ctx))
        throw new Error('Users can only be deleted from a mutation or action')
      await ctx.runMutation(internal.users.removeUserData, { userId: user.id })
    } catch (error) {
      console.error(`Cleaning up the data of user ${user.id} failed`, error)
    }
  }
