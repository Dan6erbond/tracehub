import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { toast } from 'sonner'
import {
  instanceSettingsQueryOptions,
  publicInstanceQueryOptions,
} from '#/lib/instance-queries'
import { api } from '../../convex/_generated/api'

/** Expects a route guard or loader to have ensured the query. */
export const usePublicInstance = () =>
  useSuspenseQuery(publicInstanceQueryOptions).data

/** Expects a loader to have ensured the query. */
export const useInstanceSettings = () =>
  useSuspenseQuery(instanceSettingsQueryOptions).data

export function useUpdateInstanceSettings() {
  const updateSettings = useConvexMutation(api.instance.updateSettings)
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => toast.success('Settings saved'),
    onError: (error) => toast.error(error.message),
  })
}
