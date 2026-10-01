import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { CredentialsFields } from '#/components/form/credentials-fields'
import { createUserFormOptions } from '#/components/form/create-user-form-options'
import { FormFields } from '#/components/form/form-fields'
import { useAppForm } from '#/components/form/use-app-form'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { roleLabels, userRoles } from '#/lib/roles'
import { useCreateUser } from '#/hooks/use-admin-users'

const ROLE_OPTIONS = userRoles.map((role) => ({
  value: role,
  label: roleLabels[role],
}))

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const createUser = useCreateUser()
  const form = useAppForm({
    ...createUserFormOptions,
    onSubmit: async ({ value }) => {
      await createUser.mutateAsync(value)
      onCreated()
    },
  })

  return (
    <form.AppForm>
      <form.FormElement>
        <FormFields>
          <form.AppField name="name">
            {(field) => <field.TextField label="Name" autoComplete="off" />}
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
          <form.AppField name="role">
            {(field) => (
              <field.SelectField label="Role" options={ROLE_OPTIONS} />
            )}
          </form.AppField>
        </FormFields>
        <form.SubmitButton>Create user</form.SubmitButton>
      </form.FormElement>
    </form.AppForm>
  )
}

export function CreateUserDialog() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          Create user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            The user can sign in with this email and password right away.
          </DialogDescription>
        </DialogHeader>
        <CreateUserForm onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
