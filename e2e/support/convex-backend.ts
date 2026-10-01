import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { GenericContainer, Wait } from 'testcontainers'
import { nodeModuleBin } from './paths'
import { runNode } from './run-node'
import type { StartedNetwork } from 'testcontainers'

const IMAGE =
  'ghcr.io/get-convex/convex-backend:5c7cb5bc7db457290f1769f95f1d1340912f7fd7'
const API_PORT = 3210
const SITE_PORT = 3211
const ALIAS = 'convex'

export type ConvexBackend = Awaited<ReturnType<typeof startConvexBackend>>

/**
 * The backend only knows its own origins as `CONVEX_CLOUD_URL` / `CONVEX_SITE_URL` (the JWT issuer among others),
 * so they are the address of its network alias; the app reaches it through the mapped ports instead.
 */
export async function startConvexBackend(network: StartedNetwork) {
  const container = await new GenericContainer(IMAGE)
    .withNetwork(network)
    .withNetworkAliases(ALIAS)
    .withEnvironment({
      CONVEX_CLOUD_ORIGIN: `http://${ALIAS}:${API_PORT}`,
      CONVEX_SITE_ORIGIN: `http://${ALIAS}:${SITE_PORT}`,
      DISABLE_BEACON: '1',
    })
    .withExposedPorts(API_PORT, SITE_PORT)
    .withWaitStrategy(Wait.forHttp('/version', API_PORT))
    .start()

  const { output } = await container.exec(['./generate_admin_key.sh'])
  const adminKey = output.trim().split('\n').at(-1)!
  const url = `http://127.0.0.1:${container.getMappedPort(API_PORT)}`
  const siteUrl = `http://127.0.0.1:${container.getMappedPort(SITE_PORT)}`

  const envDirectory = await mkdtemp(path.join(tmpdir(), 'tracehub-e2e-'))
  const envFile = path.join(envDirectory, 'convex.env')
  await writeFile(
    envFile,
    `CONVEX_SELF_HOSTED_URL=${url}\nCONVEX_SELF_HOSTED_ADMIN_KEY=${adminKey}\n`,
  )

  /** `--env-file` overrides the `CONVEX_DEPLOYMENT` of `.env.local`, so the CLI never reaches the dev deployment. */
  const convex = (...args: ReadonlyArray<string>) =>
    runNode(nodeModuleBin('convex/bin/main.js'), [
      ...args,
      '--env-file',
      envFile,
    ])

  return {
    url,
    siteUrl,
    deploy: async (env: Readonly<Record<string, string>>) => {
      await convex(
        'env',
        'set',
        'BETTER_AUTH_SECRET',
        randomBytes(32).toString('hex'),
      )
      for (const [name, value] of Object.entries(env))
        await convex('env', 'set', name, value)
      await convex('deploy', '--typecheck', 'disable', '--yes')
    },
    stop: async () => {
      await container.stop({ timeout: 1 })
      await rm(envDirectory, { recursive: true, force: true })
    },
  }
}
