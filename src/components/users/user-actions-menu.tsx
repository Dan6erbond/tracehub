import { useState } from 'react'
import { Ban, KeyRound, MoreHorizontal, Trash2, UserCheck } from 'lucide-react'
import { RemoveUserDialog } from '#/components/users/remove-user-dialog'
import { SetPasswordDialog } from '#/components/users/set-password-dialog'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  useBanUser,
  useSetUserRole,
  useUnbanUser,
} from '#/hooks/use-admin-users'
import { roleLabels, userRoles } from '#/lib/roles'
import type { AdminUser } from '#/lib/schemas/admin-user'
import type { UserRole } from '#/lib/roles'

type Dialog = 'password' | 'remove'

/** Actions on one user; `isSelf` withholds the ones an admin must not apply to their own account. */
export function UserActionsMenu({
  user,
  isSelf,
}: {
  user: AdminUser
  isSelf: boolean
}) {
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const setRole = useSetUserRole()
  const banUser = useBanUser()
  const unbanUser = useUnbanUser()
  const userId = user.id

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${user.email}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isSelf}>
              Set role
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={user.role ?? undefined}
                onValueChange={(role) =>
                  setRole.mutate({ userId, role: role as UserRole })
                }
              >
                {userRoles.map((role) => (
                  <DropdownMenuRadioItem key={role} value={role}>
                    {roleLabels[role]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {user.banned ? (
            <DropdownMenuItem onSelect={() => unbanUser.mutate({ userId })}>
              <UserCheck />
              Unban
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={isSelf}
              onSelect={() => banUser.mutate({ userId })}
            >
              <Ban />
              Ban
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setDialog('password')}>
            <KeyRound />
            Set password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isSelf}
            onSelect={() => setDialog('remove')}
          >
            <Trash2 />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SetPasswordDialog
        user={user}
        open={dialog === 'password'}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <RemoveUserDialog
        user={user}
        open={dialog === 'remove'}
        onOpenChange={(open) => !open && setDialog(null)}
      />
    </>
  )
}
