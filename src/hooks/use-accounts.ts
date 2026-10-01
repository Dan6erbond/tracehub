import { useQuery } from '@tanstack/react-query'
import { authClient } from '#/lib/auth-client'
import { unwrapAuth } from '#/lib/auth-result'

export const useAccounts = () =>
  useQuery({
    queryKey: ['auth', 'accounts'],
    queryFn: () => unwrapAuth(authClient.listAccounts()),
  })
