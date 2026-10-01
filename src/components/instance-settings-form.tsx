import { instanceSettingsFormOptions } from '#/components/form/instance-settings-form-options'
import { useAppForm } from '#/components/form/use-app-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  useInstanceSettings,
  useUpdateInstanceSettings,
} from '#/hooks/use-instance'

export function InstanceSettingsForm() {
  const settings = useInstanceSettings()
  const updateSettings = useUpdateInstanceSettings()
  const form = useAppForm({
    ...instanceSettingsFormOptions,
    defaultValues: settings,
    onSubmit: ({ value }) => updateSettings.mutateAsync(value),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration</CardTitle>
        <CardDescription>
          Who can create an account on this instance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form.AppForm>
          <form.FormElement>
            <form.AppField name="registrationEnabled">
              {(field) => (
                <field.SwitchField
                  label="Open registration"
                  description="Lets anyone sign up with email and password. Admins can create users either way."
                />
              )}
            </form.AppField>
            <form.SubmitButton>Save</form.SubmitButton>
          </form.FormElement>
        </form.AppForm>
      </CardContent>
    </Card>
  )
}
