import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { convexClient } from '@convex-dev/better-auth/client/plugins'
import type { createAuth } from '../../convex/auth'

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<ReturnType<typeof createAuth>>(), convexClient()],
})
