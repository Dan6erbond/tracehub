import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import type { AuthClient } from '@convex-dev/better-auth/react'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { ThemeProvider, themeInitScript } from '#/components/theme-provider'
import { authClient } from '#/lib/auth-client'
import { getToken } from '#/lib/auth-server'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import type { ConvexQueryClient } from '@convex-dev/react-query'

interface MyRouterContext {
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
}

const fetchToken = createServerFn({ method: 'GET' }).handler(() => getToken())

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ context }) => {
    const token = await fetchToken()
    if (token) {
      context.convexQueryClient.serverHttpClient?.setAuth(token)
    }
    return { token, isAuthenticated: !!token }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TraceHub',
      },
    ],
    scripts: [{ children: themeInitScript }],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function RootComponent() {
  const { convexQueryClient, token } = useRouteContext({ from: Route.id })
  return (
    <ConvexBetterAuthProvider
      client={convexQueryClient.convexClient}
      // @convex-dev/better-auth's AuthClient type collapses useSession().data to never
      authClient={authClient as unknown as AuthClient}
      initialToken={token}
    >
      <ThemeProvider>
        <Outlet />
      </ThemeProvider>
    </ConvexBetterAuthProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
