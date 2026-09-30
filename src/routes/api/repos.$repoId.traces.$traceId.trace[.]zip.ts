import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import { api } from '../../../convex/_generated/api'
import { getToken } from '#/lib/auth-server'

const paramsSchema = z.object({
  repoId: zid('repos'),
  traceId: zid('traces'),
})

// The viewer's service worker reads the zip with range requests, so these must survive the proxy.
const FORWARDED_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'etag',
]

/**
 * Streams a trace zip from Convex storage on our own origin, after checking the
 * user can access the repo. The self-hosted trace viewer runs same-origin, so it
 * needs no CORS on storage and no signed URL in the address bar.
 */
export const Route = createFileRoute(
  '/api/repos/$repoId/traces/$traceId/trace.zip',
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const ids = paramsSchema.safeParse(params)
        if (!ids.success) return new Response('Not found', { status: 404 })
        const token = await getToken()
        if (!token) return new Response('Unauthenticated', { status: 401 })

        const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL)
        convex.setAuth(token)
        const url = await convex.query(api.traces.getTraceFileUrl, ids.data)
        if (!url) return new Response('Not found', { status: 404 })

        const range = request.headers.get('range')
        const file = await fetch(url, range ? { headers: { range } } : {})
        const headers = new Headers()
        for (const name of FORWARDED_HEADERS) {
          const value = file.headers.get(name)
          if (value) headers.set(name, value)
        }
        headers.set('cache-control', 'private, no-store')
        return new Response(file.body, { status: file.status, headers })
      },
    },
  },
})
