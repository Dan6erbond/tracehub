import { formOptions } from '@tanstack/react-form'
import { signUpSchema } from '#/lib/schemas/sign-up'
import type { SignUp } from '#/lib/schemas/sign-up'

const defaultValues: SignUp = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export const signUpFormOptions = formOptions({
  defaultValues,
  validators: { onSubmit: signUpSchema },
})
