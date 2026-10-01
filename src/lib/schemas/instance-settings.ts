import { z } from 'zod'

export const instanceSettingsSchema = z.object({
  registrationEnabled: z.boolean(),
})
export type InstanceSettings = z.infer<typeof instanceSettingsSchema>

/** What an instance without a stored settings row runs with. */
export const defaultInstanceSettings: InstanceSettings = {
  registrationEnabled: false,
}
