import { defineConfig, devices } from '@playwright/test'
import { sessionFile } from './e2e/fixtures/accounts'
import { gitHostNames } from './e2e/fixtures/git-hosts'

/** The hosts' names only resolve inside the Docker network, so the browser maps them to the published ports on this machine. */
const hostResolverRules = gitHostNames
  .map((name) => `MAP ${name} 127.0.0.1`)
  .join(', ')

/** Each spec builds on the state the previous one left in the instance. */
export default defineConfig({
  testDir: './e2e/specs',
  globalSetup: './e2e/global-setup.ts',
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'on',
    launchOptions: { args: [`--host-resolver-rules=${hostResolverRules}`] },
  },
  projects: [
    { name: 'initial-setup', testMatch: '01-*.spec.ts' },
    {
      name: 'providers',
      testMatch: '02-*.spec.ts',
      dependencies: ['initial-setup'],
      use: { storageState: sessionFile('admin') },
    },
    {
      name: 'oauth',
      testMatch: '03-*.spec.ts',
      dependencies: ['providers'],
    },
    {
      name: 'repos',
      testMatch: '04-*.spec.ts',
      dependencies: ['oauth'],
      use: { storageState: sessionFile('user') },
    },
  ],
})
