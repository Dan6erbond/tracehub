import { formOptions } from '@tanstack/react-form'
import {
  defaultInstanceSettings,
  instanceSettingsSchema,
} from '#/lib/schemas/instance-settings'

export const instanceSettingsFormOptions = formOptions({
  defaultValues: defaultInstanceSettings,
  validators: { onSubmit: instanceSettingsSchema },
})
