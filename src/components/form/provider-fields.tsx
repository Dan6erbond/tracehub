import { providerFieldDefaults } from './git-provider-form-options'
import { withFieldGroup } from './use-app-form'
import type { TemplateField } from '#/lib/schemas/git-provider'

/** Maps the group onto the same-named fields of the create and update forms. */
export const providerFieldMap = {
  name: 'name',
  baseUrl: 'baseUrl',
  apiUrl: 'apiUrl',
  clientId: 'clientId',
  clientSecret: 'clientSecret',
  enabled: 'enabled',
  allowSignUp: 'allowSignUp',
  trustedForLinking: 'trustedForLinking',
} as const

const props: {
  /** The URL and name fields the admin enters; the others keep their value. */
  editable: ReadonlyArray<TemplateField>
  /** An empty secret keeps the stored one. */
  keepsSecret?: boolean
} = { editable: [] }

/** What both the create and the edit form of a Git provider ask for besides the slug. */
export const ProviderFields = withFieldGroup({
  defaultValues: providerFieldDefaults,
  props,
  render: ({ group, editable, keepsSecret }) => (
    <>
      {editable.includes('name') && (
        <group.AppField name="name">
          {(field) => (
            <field.TextField
              label="Name"
              description="Shown on the login page and next to repositories"
            />
          )}
        </group.AppField>
      )}
      {editable.includes('baseUrl') && (
        <group.AppField name="baseUrl">
          {(field) => (
            <field.TextField
              label="Base URL"
              placeholder="https://github.example.com"
              description="The web address of the host"
            />
          )}
        </group.AppField>
      )}
      {editable.includes('apiUrl') && (
        <group.AppField name="apiUrl">
          {(field) => (
            <field.TextField
              label="API URL"
              placeholder="Optional"
              description="Only if the API is not at the default location of the host"
            />
          )}
        </group.AppField>
      )}
      <group.AppField name="clientId">
        {(field) => <field.TextField label="Client ID" autoComplete="off" />}
      </group.AppField>
      <group.AppField name="clientSecret">
        {(field) => (
          <field.TextField
            label="Client secret"
            type="password"
            autoComplete="new-password"
            placeholder={keepsSecret ? 'Set' : undefined}
            description={
              keepsSecret ? 'Leave empty to keep the current secret' : undefined
            }
          />
        )}
      </group.AppField>
      <group.AppField name="enabled">
        {(field) => (
          <field.SwitchField
            label="Enabled"
            description="Lets users sign in and load repositories with this provider"
          />
        )}
      </group.AppField>
      <group.AppField name="allowSignUp">
        {(field) => (
          <field.SwitchField
            label="Allow sign-up"
            description="Lets anyone with an account on this host register, even while registration is closed"
          />
        )}
      </group.AppField>
      <group.AppField name="trustedForLinking">
        {(field) => (
          <field.SwitchField
            label="Trusted for linking"
            description="Users can connect it to their account from their profile, and signing in with it may attach it to an existing account with the same email. Only enable for hosts you trust to verify emails"
          />
        )}
      </group.AppField>
    </>
  ),
})
