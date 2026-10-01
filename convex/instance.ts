import { components, internal } from './_generated/api'
import {
  adminMutation,
  adminQuery,
  zInternalQuery,
  zQuery,
} from './lib/functions'
import { replaceOrInsert } from './lib/upsert'
import {
  defaultInstanceSettings,
  instanceSettingsSchema,
} from '../src/lib/schemas/instance-settings'
import type { Doc } from './_generated/dataModel'
import type { InstanceSettings } from '../src/lib/schemas/instance-settings'

export const findStoredSettings = zInternalQuery({
  args: {},
  handler: (ctx) => ctx.db.query('instanceSettings').first(),
})

/** The stored settings, or the defaults while an admin has not saved any. */
export const findSettings = zInternalQuery({
  args: {},
  handler: async (ctx): Promise<InstanceSettings> => {
    const stored: Doc<'instanceSettings'> | null = await ctx.runQuery(
      internal.instance.findStoredSettings,
      {},
    )
    return instanceSettingsSchema.parse(stored ?? defaultInstanceSettings)
  },
})

type PublicInstance = InstanceSettings & { needsSetup: boolean }

/** What the login page needs before anyone is signed in. */
export const getPublic = zQuery({
  args: {},
  handler: async (ctx): Promise<PublicInstance> => {
    const { registrationEnabled }: InstanceSettings = await ctx.runQuery(
      internal.instance.findSettings,
      {},
    )
    // Without a `where` the component reads one row instead of collecting the table.
    const firstUser: unknown = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      { model: 'user' },
    )
    return { needsSetup: firstUser === null, registrationEnabled }
  },
})

export const getSettings = adminQuery({
  args: {},
  handler: (ctx): Promise<InstanceSettings> =>
    ctx.runQuery(internal.instance.findSettings, {}),
})

export const updateSettings = adminMutation({
  args: instanceSettingsSchema.shape,
  handler: async (ctx, settings) => {
    const stored: Doc<'instanceSettings'> | null = await ctx.runQuery(
      internal.instance.findStoredSettings,
      {},
    )
    await replaceOrInsert(ctx, 'instanceSettings', stored, settings)
  },
})
