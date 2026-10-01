import { formOptions } from '@tanstack/react-form'
import { createUserSchema } from '#/lib/schemas/create-user'
import { userRole } from '#/lib/roles'
import type { CreateUser } from '#/lib/schemas/create-user'

const defaultValues: CreateUser = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: userRole,
}

export const createUserFormOptions = formOptions({
  defaultValues,
  validators: { onSubmit: createUserSchema },
})
