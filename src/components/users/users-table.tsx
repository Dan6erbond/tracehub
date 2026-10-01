import { UserActionsMenu } from '#/components/users/user-actions-menu'
import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatDate } from '#/lib/format'
import { adminRole, isAdminRole, roleLabels, userRole } from '#/lib/roles'
import type { AdminUser } from '#/lib/schemas/admin-user'

function UserRoleBadge({ role }: { role?: string | null }) {
  const admin = isAdminRole(role)
  return (
    <Badge variant={admin ? 'default' : 'secondary'}>
      {roleLabels[admin ? adminRole : userRole]}
    </Badge>
  )
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: Array<AdminUser>
  currentUserId?: string
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <UserRoleBadge role={user.role} />
                {user.banned && <Badge variant="destructive">Banned</Badge>}
              </div>
            </TableCell>
            <TableCell>{formatDate(user.createdAt)}</TableCell>
            <TableCell>
              <UserActionsMenu user={user} isSelf={user.id === currentUserId} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
