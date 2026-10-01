import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import {
  convexQuery,
  useConvexAction,
  useConvexMutation,
} from '@convex-dev/react-query'
import { toast } from 'sonner'
import { useSuspenseEntity } from '#/hooks/use-suspense-entity'
import { getErrorMessage } from '#/lib/errors'
import {
  adminProvidersQueryOptions,
  callbackBaseQueryOptions,
  providerQueryOptions,
  publicProvidersQueryOptions,
} from '#/lib/provider-queries'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

/** Expects a loader to have ensured the query. */
export const usePublicProviders = () =>
  useSuspenseQuery(publicProvidersQueryOptions).data

/** Expects a loader to have ensured the query. */
export const useAdminProviders = () =>
  useSuspenseQuery(adminProvidersQueryOptions).data

/** Expects a loader to have ensured the query. */
export const useGitProvider = (providerId: Id<'gitProviders'>) =>
  useSuspenseEntity(providerQueryOptions(providerId))

/** Expects a loader to have ensured the query. */
export const useCallbackBase = () =>
  useSuspenseQuery(callbackBaseQueryOptions).data

function useProviderMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  successMessage: string,
) {
  return useMutation({
    mutationFn,
    onSuccess: () => toast.success(successMessage),
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useCreateGitProvider = () =>
  useProviderMutation(
    useConvexMutation(api.gitProviders.create),
    'Provider created',
  )

export const useUpdateGitProvider = () =>
  useProviderMutation(
    useConvexMutation(api.gitProviders.update),
    'Provider saved',
  )

export const useRemoveGitProvider = () =>
  useProviderMutation(
    useConvexAction(api.gitProviders.remove),
    'Provider removed',
  )

/** What removing the provider takes along: its linked accounts and the users left without a sign-in method. */
export const useLinkedAccountSummary = (providerId: Id<'gitProviders'>) =>
  useQuery(
    convexQuery(api.gitProviders.summarizeLinkedAccounts, { providerId }),
  )
