import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ErrorAlert } from '#/components/error-alert'
import { PageTitle } from '#/components/page-title'
import { SearchInput } from '#/components/search-input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '#/components/ui/pagination'
import { Skeleton } from '#/components/ui/skeleton'
import { CreateUserDialog } from '#/components/users/create-user-dialog'
import { UsersTable } from '#/components/users/users-table'
import { useAdminUsers } from '#/hooks/use-admin-users'
import { useDebouncedValue } from '#/hooks/use-debounced-value'
import { authClient } from '#/lib/auth-client'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/admin/users')({
  component: UsersPage,
})

const disabledLink = (disabled: boolean) =>
  cn(disabled && 'pointer-events-none opacity-50')

function UsersPage() {
  const { data: session } = authClient.useSession()
  const [search, setSearch] = useState('')
  const {
    users,
    error,
    isPending,
    pageNumber,
    hasPrevious,
    hasNext,
    previous,
    next,
  } = useAdminUsers(useDebouncedValue(search.trim()))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <PageTitle
          title="Users"
          description="Everyone who can sign in to this instance."
        />
        <CreateUserDialog />
      </div>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by email"
        className="max-w-sm"
      />
      <ErrorAlert error={error} />
      {isPending && <Skeleton className="h-40 w-full" />}
      {users &&
        (users.length === 0 ? (
          <p className="text-muted-foreground">No users found.</p>
        ) : (
          <UsersTable users={users} currentUserId={session?.user.id} />
        ))}
      {users && (
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={!hasPrevious}
                className={disabledLink(!hasPrevious)}
                onClick={(event) => {
                  event.preventDefault()
                  previous()
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{pageNumber}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={!hasNext}
                className={disabledLink(!hasNext)}
                onClick={(event) => {
                  event.preventDefault()
                  next()
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
