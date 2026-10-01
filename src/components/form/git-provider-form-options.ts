import { formOptions } from '@tanstack/react-form'
import {
  createGitProviderSchema,
  updateGitProviderSchema,
} from '#/lib/schemas/git-provider'
import type {
  CreateGitProvider,
  ProviderTemplate,
  UpdateGitProvider,
} from '#/lib/schemas/git-provider'

const sharedDefaults = {
  clientId: '',
  clientSecret: '',
  enabled: true,
  allowSignUp: false,
  trustedForLinking: false,
}

export const createGitProviderFormOptions = ({
  type,
  defaults,
}: ProviderTemplate) => {
  const defaultValues: CreateGitProvider = {
    type,
    ...defaults,
    ...sharedDefaults,
  }
  return formOptions({
    defaultValues,
    validators: { onSubmit: createGitProviderSchema },
  })
}

/** The fields both forms share. */
export const providerFieldDefaults: Omit<
  UpdateGitProvider,
  'confirmHostChange'
> = {
  name: '',
  baseUrl: '',
  apiUrl: '',
  ...sharedDefaults,
}

const updateDefaults: UpdateGitProvider = {
  ...providerFieldDefaults,
  confirmHostChange: false,
}

export const updateGitProviderFormOptions = formOptions({
  defaultValues: updateDefaults,
  validators: { onSubmit: updateGitProviderSchema },
})
