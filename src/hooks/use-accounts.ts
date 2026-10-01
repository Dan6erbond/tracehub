import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePublicProviders } from '#/hooks/use-git-providers'
import { authClient } from '#/lib/auth-client'
import { profilePath } from '#/lib/auth-errors'
import { unwrapAuth } from '#/lib/auth-result'

const accountsQueryKey = ['auth', 'accounts']

const CREDENTIAL_PROVIDER_ID = 'credential'

const useAccounts = () =>
  useQuery({
    queryKey: accountsQueryKey,
    queryFn: () => unwrapAuth(authClient.listAccounts()),
  })

/** Sends the user to the provider to authorize, then back to their profile; a failure there comes back as `?error=`. */
const useLinkAccount = () =>
  useMutation({
    mutationFn: (providerSlug: string) =>
      unwrapAuth(
        authClient.linkSocial({
          provider: providerSlug,
          callbackURL: profilePath,
          errorCallbackURL: profilePath,
        }),
      ),
  })

/** Better Auth refuses to unlink the last account of a user, which surfaces as the mutation's error. */
function useUnlinkAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { providerId: string; accountId: string }) =>
      unwrapAuth(authClient.unlinkAccount(variables)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
  })
}

/** The user's sign-in methods, named after their providers, and the enabled providers trusted for linking they can still connect. Expects a loader to have ensured the public providers. */
export function useLinkedAccounts() {
  const accounts = useAccounts()
  const providers = usePublicProviders()
  const link = useLinkAccount()
  const unlink = useUnlinkAccount()

  const linkedIds = new Set(accounts.data?.map(({ providerId }) => providerId))
  return {
    accounts: accounts.data?.map(
      ({ id, providerId, accountId, createdAt }) => ({
        id,
        providerId,
        accountId,
        createdAt,
        isPassword: providerId === CREDENTIAL_PROVIDER_ID,
        name:
          providerId === CREDENTIAL_PROVIDER_ID
            ? 'Password'
            : (providers.find(({ slug }) => slug === providerId)?.name ??
              providerId),
      }),
    ),
    isPending: accounts.isPending,
    error: accounts.error,
    connectable: providers.filter(
      ({ slug, trustedForLinking }) =>
        trustedForLinking && !linkedIds.has(slug),
    ),
    link,
    unlink,
  }
}
