import { updateGitProviderFormOptions } from '#/components/form/git-provider-form-options'
import { FormFields } from '#/components/form/form-fields'
import {
  ProviderFields,
  providerFieldMap,
} from '#/components/form/provider-fields'
import { useAppForm } from '#/components/form/use-app-form'
import { useUpdateGitProvider } from '#/hooks/use-git-providers'
import { editableFieldsOf, normalizeBaseUrl } from '#/lib/schemas/git-provider'
import type { GitProviderAdmin } from '#/lib/schemas/git-provider'

const normalizeAddress = (value: string) =>
  URL.canParse(value) ? normalizeBaseUrl(value) : value

export function EditProviderForm({ provider }: { provider: GitProviderAdmin }) {
  const updateProvider = useUpdateGitProvider()
  const form = useAppForm({
    ...updateGitProviderFormOptions,
    defaultValues: {
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiUrl: provider.apiUrl ?? '',
      clientId: provider.clientId,
      clientSecret: '',
      enabled: provider.enabled,
      allowSignUp: provider.allowSignUp,
      trustedForLinking: provider.trustedForLinking,
      confirmHostChange: false,
    },
    onSubmit: ({ value }) =>
      updateProvider.mutateAsync({ providerId: provider._id, ...value }),
  })

  return (
    <form.AppForm>
      <form.FormElement>
        <FormFields>
          <ProviderFields
            form={form}
            fields={providerFieldMap}
            editable={editableFieldsOf(provider.baseUrl)}
            keepsSecret={provider.hasSecret}
          />
          <form.Subscribe
            selector={({ values }) =>
              normalizeAddress(values.baseUrl) !== provider.baseUrl ||
              (values.apiUrl === ''
                ? undefined
                : normalizeAddress(values.apiUrl)) !== provider.apiUrl
            }
          >
            {(addressChanged) =>
              addressChanged && (
                <form.AppField
                  name="confirmHostChange"
                  validators={{
                    onSubmit: ({ value }) =>
                      value
                        ? undefined
                        : 'Confirm that this is the same instance',
                  }}
                >
                  {(field) => (
                    <field.SwitchField
                      label="This is the same instance, moved"
                      description="Linked accounts and repositories stay attached to this provider and are matched by the host's numeric ids. Only confirm if the new address serves the same data, not a different server"
                    />
                  )}
                </form.AppField>
              )
            }
          </form.Subscribe>
        </FormFields>
        <form.SubmitButton>Save</form.SubmitButton>
      </form.FormElement>
    </form.AppForm>
  )
}
