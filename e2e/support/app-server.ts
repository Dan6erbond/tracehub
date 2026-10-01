import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { nodeModuleBin, projectRoot } from './paths'
import { runNode } from './run-node'
import type { ChildProcess } from 'node:child_process'

type AppConfig = {
  url: string
  port: number
  convexUrl: string
  convexSiteUrl: string
  httpProviderHosts: string
  logDirectory: string
}

/** `VITE_` variables are inlined at build time, so the app is built for this run's backend. */
async function buildApp({
  convexUrl,
  convexSiteUrl,
  httpProviderHosts,
}: AppConfig) {
  await runNode(path.join(projectRoot, 'scripts/copy-trace-viewer.mjs'), [])
  await runNode(nodeModuleBin('vite/bin/vite.js'), ['build'], {
    VITE_CONVEX_URL: convexUrl,
    VITE_CONVEX_SITE_URL: convexSiteUrl,
    VITE_HTTP_PROVIDER_HOSTS: httpProviderHosts,
  })
}

const isUp = (url: string) =>
  fetch(url).then(
    () => true,
    () => false,
  )

async function waitUntilUp(url: string, server: ChildProcess) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(`The app server exited with code ${server.exitCode}`)
    if (await isUp(url)) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`The app server did not answer at ${url}`)
}

export async function startApp(config: AppConfig) {
  const { url, port, logDirectory } = config
  await buildApp(config)

  await mkdir(logDirectory, { recursive: true })
  const log = createWriteStream(path.join(logDirectory, 'app-server.log'))
  const server = spawn(
    process.execPath,
    [path.join(projectRoot, '.output/server/index.mjs')],
    {
      cwd: projectRoot,
      env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  server.stdout.pipe(log)
  server.stderr.pipe(log)

  await waitUntilUp(url, server)
  return { stop: () => server.kill() }
}
