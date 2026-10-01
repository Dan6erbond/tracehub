import path from 'node:path'
import { Network } from 'testcontainers'
import { gitHostNames } from './fixtures/git-hosts'
import { publishRunState } from './fixtures/run-state'
import { seedGitHost } from './fixtures/seed'
import { startApp } from './support/app-server'
import { startConvexBackend } from './support/convex-backend'
import { startGitHost } from './support/git-host-container'
import { freePort } from './support/ports'
import { projectRoot } from './support/paths'

export default async function globalSetup() {
  const stops: Array<() => Promise<unknown> | unknown> = []
  const stopAll = async () => {
    for (const stop of stops.reverse())
      await Promise.resolve(stop()).catch(() => undefined)
  }

  try {
    const network = await new Network().start()
    stops.push(() => network.stop())

    const port = await freePort()
    const appUrl = `http://127.0.0.1:${port}`

    const [convex, ...hosts] = await Promise.all([
      startConvexBackend(network),
      ...gitHostNames.map((name) => startGitHost(network, name)),
    ])
    stops.push(convex.stop, ...hosts.map((host) => host.stop))

    const httpProviderHosts = hosts.map(({ name }) => name).join(',')
    const [, ...gitHosts] = await Promise.all([
      convex.deploy({
        SITE_URL: appUrl,
        HTTP_PROVIDER_HOSTS: httpProviderHosts,
      }),
      ...hosts.map((host) => seedGitHost(host, `${appUrl}/api/auth/callback`)),
    ])

    const app = await startApp({
      url: appUrl,
      port,
      convexUrl: convex.url,
      convexSiteUrl: convex.siteUrl,
      httpProviderHosts,
      logDirectory: path.join(projectRoot, 'test-results'),
    })
    stops.push(app.stop)

    publishRunState({ appUrl, gitHosts })
  } catch (error) {
    await stopAll()
    throw error
  }

  return stopAll
}
