import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const publicProvidersQueryOptions = convexQuery(
  api.gitProviders.listPublic,
  {},
)

export const adminProvidersQueryOptions = convexQuery(api.gitProviders.list, {})

export const providerQueryOptions = (providerId: Id<'gitProviders'>) =>
  convexQuery(api.gitProviders.get, { providerId })

export const callbackBaseQueryOptions = convexQuery(
  api.gitProviders.getCallbackBase,
  {},
)
