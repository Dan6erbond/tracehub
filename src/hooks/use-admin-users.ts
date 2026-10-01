import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { toast } from 'sonner'
import { authClient } from '#/lib/auth-client'
import { unwrapAuth } from '#/lib/auth-result'
import { api } from '../../convex/_generated/api'
import type { CreateUser } from '#/lib/schemas/create-user'
import type { UserRole } from '#/lib/roles'

const ADMIN_USERS_PAGE_SIZE = 10

type Cursors = { search: string; stack: Array<string | null> }

/**
 * Pages through the users with a stack of cursors: page n starts at the `continueCursor` of page n - 1.
 * The stack starts over when the search changes, and steps back when the current page has emptied, e.g. after its last user was removed.
 */
export function useAdminUsers(search: string) {
  const [cursors, setCursors] = useState<Cursors>({ search, stack: [null] })
  const stack = cursors.search === search ? cursors.stack : [null]
  const pageIndex = stack.length - 1

  const users = useQuery({
    ...convexQuery(api.users.listUsers, {
      search: search || undefined,
      paginationOpts: {
        numItems: ADMIN_USERS_PAGE_SIZE,
        cursor: stack[pageIndex],
      },
    }),
    placeholderData: keepPreviousData,
  })
  const { data, isPlaceholderData } = users

  const goBack = () => setCursors({ search, stack: stack.slice(0, -1) })

  useEffect(() => {
    if (data && !isPlaceholderData && data.page.length === 0 && pageIndex > 0)
      setCursors({ search, stack: stack.slice(0, -1) })
  }, [data, isPlaceholderData, pageIndex, search, stack])

  return {
    users: data?.page,
    error: users.error,
    isPending: users.isPending,
    pageNumber: pageIndex + 1,
    hasPrevious: pageIndex > 0,
    hasNext: data !== undefined && !data.isDone,
    previous: goBack,
    next: () => {
      if (data && !data.isDone)
        setCursors({ search, stack: [...stack, data.continueCursor] })
    },
  }
}

/** A user-management call that reports the outcome in a toast; the listing is a live Convex query, so it follows on its own. */
function useUserMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  successMessage: string,
) {
  return useMutation({
    mutationFn,
    onSuccess: () => toast.success(successMessage),
    onError: (error) => toast.error(error.message),
  })
}

export const useCreateUser = () =>
  useUserMutation(
    ({ name, email, password, role }: CreateUser) =>
      unwrapAuth(authClient.admin.createUser({ name, email, password, role })),
    'User created',
  )

export const useSetUserRole = () =>
  useUserMutation(
    (variables: { userId: string; role: UserRole }) =>
      unwrapAuth(authClient.admin.setRole(variables)),
    'Role updated',
  )

export const useBanUser = () =>
  useUserMutation(
    (variables: { userId: string }) =>
      unwrapAuth(authClient.admin.banUser(variables)),
    'User banned',
  )

export const useUnbanUser = () =>
  useUserMutation(
    (variables: { userId: string }) =>
      unwrapAuth(authClient.admin.unbanUser(variables)),
    'User unbanned',
  )

export const useSetUserPassword = () =>
  useUserMutation(
    (variables: { userId: string; newPassword: string }) =>
      unwrapAuth(authClient.admin.setUserPassword(variables)),
    'Password updated',
  )

export const useRemoveUser = () =>
  useUserMutation(
    (variables: { userId: string }) =>
      unwrapAuth(authClient.admin.removeUser(variables)),
    'User removed',
  )
