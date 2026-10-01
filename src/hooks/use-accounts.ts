import { useQuery } from '@tanstack/react-query'
import { authClient } from '#/lib/auth-client'

export const useAccounts = () =>
  useQuery({
    queryKey: ['auth', 'accounts'],
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts()
      if (error) throw new Error(error.message)
      return data
    },
  })
