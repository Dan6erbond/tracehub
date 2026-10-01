import { CredentialsFields } from '#/components/form/credentials-fields'
import { signInFormOptions } from '#/components/form/sign-in-form-options'
import { FormFields } from '#/components/form/form-fields'
import { useAppForm } from '#/components/form/use-app-form'
import { ErrorAlert } from '#/components/error-alert'
import { useSignIn } from '#/hooks/use-auth'

export function SignInForm() {
  const signIn = useSignIn()
  const form = useAppForm({
    ...signInFormOptions,
    onSubmit: ({ value }) => signIn.mutateAsync(value),
  })

  return (
    <form.AppForm>
      <form.FormElement>
        <FormFields>
          <CredentialsFields
            form={form}
            fields={{ email: 'email', password: 'password' }}
            passwordAutoComplete="current-password"
          />
        </FormFields>
        <ErrorAlert error={signIn.error} />
        <form.SubmitButton>Sign in</form.SubmitButton>
      </form.FormElement>
    </form.AppForm>
  )
}
