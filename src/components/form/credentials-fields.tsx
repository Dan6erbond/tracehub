import { withFieldGroup } from './use-app-form'
import type { SignUp } from '#/lib/schemas/sign-up'

const defaultValues: Pick<SignUp, 'email' | 'password'> &
  Partial<Pick<SignUp, 'confirmPassword'>> = {
  email: '',
  password: '',
}

const props: {
  passwordAutoComplete?: 'current-password' | 'new-password'
  confirm?: boolean
} = {}

/**
 * Email and password, mapped onto the same-named fields of the sign-in, sign-up and create-user forms.
 * With `confirm`, a confirmation field follows the password; map `confirmPassword` too, and let the form's schema check they match.
 */
export const CredentialsFields = withFieldGroup({
  defaultValues,
  props,
  render: ({ group, passwordAutoComplete = 'new-password', confirm }) => (
    <>
      <group.AppField name="email">
        {(field) => (
          <field.TextField label="Email" type="email" autoComplete="email" />
        )}
      </group.AppField>
      <group.AppField name="password">
        {(field) => (
          <field.TextField
            label="Password"
            type="password"
            autoComplete={passwordAutoComplete}
          />
        )}
      </group.AppField>
      {confirm && (
        <group.AppField name="confirmPassword">
          {(field) => (
            <field.TextField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
            />
          )}
        </group.AppField>
      )}
    </>
  ),
})
