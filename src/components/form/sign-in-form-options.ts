import { formOptions } from '@tanstack/react-form'
import { signInSchema } from '#/lib/schemas/sign-in'
import type { SignIn } from '#/lib/schemas/sign-in'

const defaultValues: SignIn = { email: '', password: '' }

export const signInFormOptions = formOptions({
  defaultValues,
  validators: { onSubmit: signInSchema },
})
