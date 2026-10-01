import { GenericContainer, Wait } from 'testcontainers'
import { gitHostUser } from '../fixtures/git-hosts'
import { freePort } from './ports'
import type { StartedNetwork } from 'testcontainers'
import type { GitHostName } from '../fixtures/git-hosts'

const hosts = {
  gitea: { image: 'gitea/gitea:28.0.0', cli: 'gitea', envPrefix: 'GITEA' },
  forgejo: {
    image: 'codeberg.org/forgejo/forgejo:16.0.5',
    cli: 'forgejo',
    envPrefix: 'FORGEJO',
  },
} satisfies Record<
  GitHostName,
  { image: string; cli: string; envPrefix: string }
>

/**
 * The host listens on a free host port P inside and outside the container, and its `ROOT_URL` is `http://<name>:P/`.
 * That address works for the Convex container through the network alias and for the browser through a host-resolver rule, so OAuth redirects and API calls share it.
 */
export async function startGitHost(network: StartedNetwork, name: GitHostName) {
  const { image, cli, envPrefix } = hosts[name]
  const port = await freePort()
  const settings = {
    security__INSTALL_LOCK: 'true',
    database__DB_TYPE: 'sqlite3',
    server__DOMAIN: name,
    server__HTTP_PORT: String(port),
    server__ROOT_URL: `http://${name}:${port}/`,
    server__DISABLE_SSH: 'true',
    service__DISABLE_REGISTRATION: 'true',
    actions__ENABLED: 'false',
    log__LEVEL: 'Warn',
  }

  const container = await new GenericContainer(image)
    .withNetwork(network)
    .withNetworkAliases(name)
    .withEnvironment(
      Object.fromEntries(
        Object.entries(settings).map(([key, value]) => [
          `${envPrefix}__${key}`,
          value,
        ]),
      ),
    )
    .withExposedPorts({ container: port, host: port })
    .withWaitStrategy(Wait.forHttp('/api/healthz', port))
    .start()

  const { username, password, email } = gitHostUser(name)
  const { exitCode, output } = await container.exec(
    [
      cli,
      'admin',
      'user',
      'create',
      '--admin',
      '--username',
      username,
      '--password',
      password,
      '--email',
      email,
      '--must-change-password=false',
    ],
    { user: 'git' },
  )
  if (exitCode !== 0)
    throw new Error(`Creating the ${name} admin failed: ${output}`)

  return {
    name,
    baseUrl: `http://${name}:${port}`,
    apiUrl: `http://127.0.0.1:${port}/api/v1`,
    stop: () => container.stop({ timeout: 1 }),
  }
}

export type GitHost = Awaited<ReturnType<typeof startGitHost>>
