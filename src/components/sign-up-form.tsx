import { CredentialsFields } from '#/components/form/credentials-fields'
import { signUpFormOptions } from '#/components/form/sign-up-form-options'
import { FormFields } from '#/components/form/form-fields'
import { useAppForm } from '#/components/form/use-app-form'
import { ErrorAlert } from '#/components/error-alert'
import { useSignUp } from '#/hooks/use-auth'

/** Registers an account and signs it in; on a fresh instance the account becomes its admin. */
export function SignUpForm({
  submitLabel,
  redirectTo,
}: {
  submitLabel: string
  redirectTo: Parameters<typeof useSignUp>[0]
}) {
  const signUp = useSignUp(redirectTo)
  const form = useAppForm({
    ...signUpFormOptions,
    onSubmit: ({ value }) => signUp.mutateAsync(value),
  })

  return (
    <form.AppForm>
      <form.FormElement>
        <FormFields>
          <form.AppField name="name">
            {(field) => <field.TextField label="Name" autoComplete="name" />}
          </form.AppField>
          <CredentialsFields
            form={form}
            fields={{
              email: 'email',
              password: 'password',
              confirmPassword: 'confirmPassword',
            }}
            confirm
          />
        </FormFields>
        <ErrorAlert error={signUp.error} />
        <form.SubmitButton>{submitLabel}</form.SubmitButton>
      </form.FormElement>
    </form.AppForm>
  )
}
