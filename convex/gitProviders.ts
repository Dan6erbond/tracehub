import { z } from 'zod'
import { ConvexError } from 'convex/values'
import { asyncMap } from 'convex-helpers'
import { zid } from 'convex-helpers/server/zod4'
import { components, internal } from './_generated/api'
import {
  adminAction,
  adminMutation,
  adminQuery,
  zInternalMutation,
  zInternalQuery,
  zQuery,
} from './lib/functions'
import { env } from './_generated/server'
import { toProviderConfig } from './lib/gitProviders/providerConfig'
import {
  decryptSecret,
  encryptSecret,
  isReadableSecret,
} from './lib/gitProviders/secret'
import { insertAndGet, replaceOrInsert } from './lib/upsert'
import { errorCodes } from '../src/lib/errors'
import {
  createGitProviderSchema,
  editableFieldsOf,
  gitProviderAdminSchema,
  gitProviderPublicSchema,
  normalizeBaseUrl,
  updateGitProviderSchema,
} from '../src/lib/schemas/git-provider'
import type { PaginationResult } from 'convex/server'
import type { Doc, Id } from './_generated/dataModel'
import type { ActionCtx, MutationCtx } from './_generated/server'
import type { ProviderWithCredentials } from './lib/gitProviders/types'
import type { GitProviderAdmin } from '../src/lib/schemas/git-provider'

const toAdminView = async ({
  clientSecret,
  ...provider
}: Doc<'gitProviders'>): Promise<GitProviderAdmin> => ({
  ...provider,
  hasSecret: await isReadableSecret(clientSecret),
})

// Accounts are deleted in batches that stay well below the limits of one mutation.
const ACCOUNT_BATCH_SIZE = 200
// The confirmation only needs to say roughly how many accounts will go: one page is looked at, and each of its users costs a lookup.
const SUMMARY_ACCOUNT_LIMIT = 100
const LISTED_USERS_LIMIT = 10
const USER_ACCOUNTS_LIMIT = 20

/** Form values to stored ones: URLs without trailing slashes, an empty API URL unset. */
const normalizeUrls = ({
  baseUrl,
  apiUrl,
}: {
  baseUrl: string
  apiUrl: string
}) => ({
  baseUrl: normalizeBaseUrl(baseUrl),
  apiUrl: apiUrl === '' ? undefined : normalizeBaseUrl(apiUrl),
})

const providerNotFound = () =>
  new ConvexError({
    code: errorCodes.providerNotFound,
    message: 'Provider not found',
  })

export const findById = zInternalQuery({
  args: { providerId: zid('gitProviders') },
  handler: (ctx, { providerId }) => ctx.db.get('gitProviders', providerId),
})

export const findBySlug = zInternalQuery({
  args: { slug: z.string() },
  handler: (ctx, { slug }) =>
    ctx.db
      .query('gitProviders')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique(),
})

/** The rows as stored; the client secret is still encrypted. */
export const listEnabled = zInternalQuery({
  args: {},
  handler: (ctx) =>
    ctx.db
      .query('gitProviders')
      .withIndex('by_enabled', (q) => q.eq('enabled', true))
      .collect(),
})

/**
 * Where client secrets are decrypted, for the auth plugin that registers the providers with Better Auth.
 * A secret that cannot be decrypted, e.g. after `BETTER_AUTH_SECRET` changed, drops its provider instead of failing every sign-in.
 */
export const listEnabledWithSecrets = zInternalQuery({
  args: {},
  handler: async (ctx): Promise<Array<ProviderWithCredentials>> => {
    const providers: Array<Doc<'gitProviders'>> = await ctx.runQuery(
      internal.gitProviders.listEnabled,
      {},
    )
    const loaded = await asyncMap(providers, async (doc) => {
      try {
        return {
          provider: toProviderConfig(doc),
          credentials: {
            clientId: doc.clientId,
            clientSecret: await decryptSecret(doc.clientSecret),
          },
        }
      } catch (error) {
        console.error(`Could not decrypt the secret of ${doc.slug}`, error)
        return null
      }
    })
    return loaded.filter((entry) => entry !== null)
  },
})

export const listPublic = zQuery({
  args: {},
  returns: z.array(gitProviderPublicSchema),
  handler: async (ctx) => {
    const providers: Array<Doc<'gitProviders'>> = await ctx.runQuery(
      internal.gitProviders.listEnabled,
      {},
    )
    return providers.map(({ slug, name, type, trustedForLinking }) => ({
      slug,
      name,
      type,
      trustedForLinking,
    }))
  },
})

export const list = adminQuery({
  args: {},
  returns: z.array(gitProviderAdminSchema),
  handler: async (ctx) => {
    const providers = await ctx.db.query('gitProviders').collect()
    return asyncMap(providers, toAdminView)
  },
})

export const get = adminQuery({
  args: { providerId: zid('gitProviders') },
  returns: gitProviderAdminSchema.nullable(),
  handler: async (ctx, { providerId }): Promise<GitProviderAdmin | null> => {
    const provider: Doc<'gitProviders'> | null = await ctx.runQuery(
      internal.gitProviders.findById,
      { providerId },
    )
    return provider && (await toAdminView(provider))
  },
})

/** Where the Git hosts send users back to; the admin registers `<this>/<slug>` as the OAuth app's callback URL. */
export const getCallbackBase = adminQuery({
  args: {},
  returns: z.string(),
  handler: () => `${new URL(env.SITE_URL).origin}/api/auth/callback`,
})

export const create = adminMutation({
  args: createGitProviderSchema,
  handler: async (ctx, { clientSecret, ...provider }) => {
    const taken: Doc<'gitProviders'> | null = await ctx.runQuery(
      internal.gitProviders.findBySlug,
      { slug: provider.slug },
    )
    if (taken)
      throw new ConvexError({
        code: errorCodes.providerSlugTaken,
        message: `The slug "${provider.slug}" is already in use`,
      })
    const stored = await insertAndGet(ctx, 'gitProviders', {
      ...provider,
      ...normalizeUrls(provider),
      clientSecret: await encryptSecret(clientSecret),
    })
    return stored._id
  },
})

/**
 * The slug and type are fixed: accounts and repos refer to them. An empty `clientSecret` keeps the stored one.
 * Linked accounts are matched by the host's numeric ids, so moving a provider to another address is only safe for the same instance, which the admin confirms.
 */
export const update = adminMutation({
  args: updateGitProviderSchema.extend({ providerId: zid('gitProviders') }),
  handler: async (
    ctx,
    { providerId, clientSecret, confirmHostChange, ...fields },
  ) => {
    const existing: Doc<'gitProviders'> | null = await ctx.runQuery(
      internal.gitProviders.findById,
      { providerId },
    )
    if (!existing) throw providerNotFound()
    const urls = normalizeUrls(fields)
    const addressChanged =
      urls.baseUrl !== existing.baseUrl || urls.apiUrl !== existing.apiUrl
    if (
      addressChanged &&
      !editableFieldsOf(existing.baseUrl).includes('baseUrl')
    )
      throw new ConvexError({
        code: errorCodes.providerUrlsLocked,
        message: 'The addresses of this provider cannot be changed',
      })
    if (!confirmHostChange && addressChanged)
      throw new ConvexError({
        code: errorCodes.hostChangeUnconfirmed,
        message:
          'Confirm that the new address is the same instance, not a different server',
      })
    await replaceOrInsert(ctx, 'gitProviders', existing, {
      slug: existing.slug,
      type: existing.type,
      ...fields,
      ...urls,
      clientSecret:
        clientSecret === ''
          ? existing.clientSecret
          : await encryptSecret(clientSecret),
    })
  },
})

interface AccountScan {
  accountCount: number
  /** Users in the page whose accounts all go through the provider. */
  strandedUserIds: Array<string>
  isDone: boolean
  continueCursor: string
}

/** One page of the accounts linked through `slug`, and which of their users have no other sign-in method left. */
export const scanLinkedAccounts = zInternalQuery({
  args: {
    slug: z.string(),
    cursor: z.string().nullable(),
    numItems: z.number(),
  },
  handler: async (ctx, { slug, cursor, numItems }): Promise<AccountScan> => {
    const {
      page,
      isDone,
      continueCursor,
    }: PaginationResult<{ userId: string }> = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: 'account',
        where: [{ field: 'providerId', value: slug }],
        paginationOpts: { numItems, cursor },
      },
    )
    const userIds = [...new Set(page.map(({ userId }) => userId))]
    const stranded = await asyncMap(userIds, async (userId) => {
      const { page: accounts }: PaginationResult<{ providerId: string }> =
        await ctx.runQuery(components.betterAuth.adapter.findMany, {
          model: 'account',
          where: [{ field: 'userId', value: userId }],
          paginationOpts: { numItems: USER_ACCOUNTS_LIMIT, cursor: null },
        })
      return accounts.every((account) => account.providerId === slug)
        ? userId
        : null
    })
    return {
      accountCount: page.length,
      strandedUserIds: stranded.filter((userId) => userId !== null),
      isDone,
      continueCursor,
    }
  },
})

const linkedAccountSummarySchema = z.object({
  count: z.number(),
  strandedCount: z.number(),
  strandedEmails: z.array(z.string()),
  more: z.boolean(),
})

/** What removing a provider takes along, judged from the first accounts only (`more` says there are further ones). Stranded users are those with no other account. */
export const summarizeLinkedAccounts = adminQuery({
  args: { providerId: zid('gitProviders') },
  returns: linkedAccountSummarySchema,
  handler: async (
    ctx,
    { providerId },
  ): Promise<z.infer<typeof linkedAccountSummarySchema>> => {
    const provider: Doc<'gitProviders'> | null = await ctx.runQuery(
      internal.gitProviders.findById,
      { providerId },
    )
    if (!provider)
      return { count: 0, strandedCount: 0, strandedEmails: [], more: false }
    const scan: AccountScan = await ctx.runQuery(
      internal.gitProviders.scanLinkedAccounts,
      { slug: provider.slug, cursor: null, numItems: SUMMARY_ACCOUNT_LIMIT },
    )
    const users = await asyncMap(
      scan.strandedUserIds.slice(0, LISTED_USERS_LIMIT),
      (userId): Promise<{ email: string } | null> =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: 'user',
          where: [{ field: '_id', value: userId }],
        }),
    )
    return {
      count: scan.accountCount,
      strandedCount: scan.strandedUserIds.length,
      strandedEmails: users.flatMap((user) => (user ? [user.email] : [])),
      more: !scan.isDone,
    }
  },
})

const assertUnused = async (
  ctx: Pick<MutationCtx, 'runQuery'>,
  providerId: Id<'gitProviders'>,
) => {
  const inUse: boolean = await ctx.runQuery(internal.repos.existsForProvider, {
    providerId,
  })
  if (inUse)
    throw new ConvexError({
      code: errorCodes.providerInUse,
      message: 'Repositories of this provider exist, disable it instead',
    })
}

/** Fails while repos refer to the provider, else disables it so nobody can link again while its accounts are being removed. */
export const prepareRemoval = zInternalMutation({
  args: { providerId: zid('gitProviders') },
  handler: async (ctx, { providerId }): Promise<string> => {
    const existing: Doc<'gitProviders'> | null = await ctx.runQuery(
      internal.gitProviders.findById,
      { providerId },
    )
    if (!existing) throw providerNotFound()
    await assertUnused(ctx, providerId)
    await ctx.db.patch('gitProviders', providerId, { enabled: false })
    return existing.slug
  },
})

/**
 * The last step of a removal, in one transaction: a reload or sign-in that was already running when the removal started can still have added repos or accounts.
 * Whatever is left is deleted with the row, or the removal fails and can be repeated.
 */
export const finalizeRemoval = zInternalMutation({
  args: { providerId: zid('gitProviders') },
  handler: async (ctx, { providerId }) => {
    const existing: Doc<'gitProviders'> | null = await ctx.runQuery(
      internal.gitProviders.findById,
      { providerId },
    )
    if (!existing) return
    await assertUnused(ctx, providerId)
    const { isDone }: { isDone: boolean } = await ctx.runMutation(
      components.betterAuth.adapter.deleteMany,
      {
        input: {
          model: 'account',
          where: [{ field: 'providerId', value: existing.slug }],
        },
        paginationOpts: { numItems: ACCOUNT_BATCH_SIZE, cursor: null },
      },
    )
    if (!isDone) throw new Error('Accounts are still being linked, try again')
    await ctx.db.delete('gitProviders', providerId)
  },
})

type DeleteInput =
  | { model: 'account'; where: [{ field: 'providerId'; value: string }] }
  | { model: 'session'; where: [{ field: 'userId'; value: string }] }

/** Deletes every match in batches that stay within the limits of one mutation. */
const deleteAll = async (ctx: ActionCtx, input: DeleteInput) => {
  let isDone = false
  while (!isDone)
    ({ isDone } = await ctx.runMutation(
      components.betterAuth.adapter.deleteMany,
      { input, paginationOpts: { numItems: ACCOUNT_BATCH_SIZE, cursor: null } },
    ))
}

/**
 * Repos refer to their provider, so one in use can only be disabled.
 * The accounts linked through the slug go with it: a later provider reusing the slug would otherwise inherit them, and the host's numeric ids can coincide across instances.
 * Users whose only sign-in method that was are signed out everywhere; an admin can give them a password under Users.
 * The row is deleted last, so a failure leaves a disabled provider that can be removed again.
 */
export const remove = adminAction({
  args: { providerId: zid('gitProviders') },
  handler: async (ctx, { providerId }) => {
    const slug: string = await ctx.runMutation(
      internal.gitProviders.prepareRemoval,
      { providerId },
    )
    let cursor: string | null = null
    let isDone = false
    while (!isDone) {
      const scan: AccountScan = await ctx.runQuery(
        internal.gitProviders.scanLinkedAccounts,
        { slug, cursor, numItems: ACCOUNT_BATCH_SIZE },
      )
      for (const userId of scan.strandedUserIds)
        await deleteAll(ctx, {
          model: 'session',
          where: [{ field: 'userId', value: userId }],
        })
      ;({ isDone, continueCursor: cursor } = scan)
    }
    await deleteAll(ctx, {
      model: 'account',
      where: [{ field: 'providerId', value: slug }],
    })
    await ctx.runMutation(internal.gitProviders.finalizeRemoval, { providerId })
  },
})
