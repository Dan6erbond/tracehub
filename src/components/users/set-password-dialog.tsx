import { setPasswordFormOptions } from '#/components/form/set-password-form-options'
import { FormFields } from '#/components/form/form-fields'
import { useAppForm } from '#/components/form/use-app-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useSetUserPassword } from '#/hooks/use-admin-users'
import type { AdminUser } from '#/lib/schemas/admin-user'

function SetPasswordForm({
  userId,
  onDone,
}: {
  userId: string
  onDone: () => void
}) {
  const setUserPassword = useSetUserPassword()
  const form = useAppForm({
    ...setPasswordFormOptions,
    onSubmit: async ({ value }) => {
      await setUserPassword.mutateAsync({
        userId,
        newPassword: value.password,
      })
      onDone()
    },
  })

  return (
    <form.AppForm>
      <form.FormElement>
        <FormFields>
          <form.AppField name="password">
            {(field) => (
              <field.TextField
                label="New password"
                type="password"
                autoComplete="new-password"
              />
            )}
          </form.AppField>
          <form.AppField name="confirmPassword">
            {(field) => (
              <field.TextField
                label="Confirm password"
                type="password"
                autoComplete="new-password"
              />
            )}
          </form.AppField>
        </FormFields>
        <form.SubmitButton>Set password</form.SubmitButton>
      </form.FormElement>
    </form.AppForm>
  )
}

export function SetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set password</DialogTitle>
          <DialogDescription>
            Replaces the password of {user.email}.
          </DialogDescription>
        </DialogHeader>
        <SetPasswordForm userId={user.id} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
