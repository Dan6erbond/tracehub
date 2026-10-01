export const adminRole = 'admin'
export const userRole = 'user'

export const userRoles = [adminRole, userRole] as const
export type UserRole = (typeof userRoles)[number]

/** Better Auth stores several roles of a user as one comma-separated string. */
export const isAdminRole = (role?: string | null) =>
  role?.split(',').includes(adminRole) ?? false

export const roleLabels: Record<UserRole, string> = {
  [adminRole]: 'Admin',
  [userRole]: 'User',
}
