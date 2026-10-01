import { createGitProviderFormOptions } from '#/components/form/git-provider-form-options'
import { FormFields } from '#/components/form/form-fields'
import {
  ProviderFields,
  providerFieldMap,
} from '#/components/form/provider-fields'
import { useAppForm } from '#/components/form/use-app-form'
import { CallbackUrl } from '#/components/providers/callback-url'
import { useCreateGitProvider } from '#/hooks/use-git-providers'
import type { ProviderTemplate } from '#/lib/schemas/git-provider'

export function CreateProviderForm({
  template,
  callbackBase,
  onCreated,
}: {
  template: ProviderTemplate
  callbackBase: string
  onCreated: () => void
}) {
  const createProvider = useCreateGitProvider()
  const form = useAppForm({
    ...createGitProviderFormOptions(template),
    onSubmit: async ({ value }) => {
      await createProvider.mutateAsync(value)
      onCreated()
    },
  })

  return (
    <form.AppForm>
      <form.FormElement>
        <FormFields>
          {template.editable.includes('slug') && (
            <form.AppField name="slug">
              {(field) => (
                <field.TextField
                  label="Slug"
                  description="Identifies the provider in the callback URL and in linked accounts. It cannot be changed later"
                />
              )}
            </form.AppField>
          )}
          <form.Subscribe selector={(state) => state.values.slug}>
            {(slug) => <CallbackUrl url={`${callbackBase}/${slug}`} />}
          </form.Subscribe>
          <ProviderFields
            form={form}
            fields={providerFieldMap}
            editable={template.editable}
          />
        </FormFields>
        <form.SubmitButton>Create provider</form.SubmitButton>
      </form.FormElement>
    </form.AppForm>
  )
}
