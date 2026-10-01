import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'

export const publicInstanceQueryOptions = convexQuery(
  api.instance.getPublic,
  {},
)

export const instanceSettingsQueryOptions = convexQuery(
  api.instance.getSettings,
  {},
)
