import { formOptions } from '@tanstack/react-form'
import { setPasswordSchema } from '#/lib/schemas/set-password'
import type { SetPassword } from '#/lib/schemas/set-password'

const defaultValues: SetPassword = { password: '', confirmPassword: '' }

export const setPasswordFormOptions = formOptions({
  defaultValues,
  validators: { onSubmit: setPasswordSchema },
})
