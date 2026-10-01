import { gitHostState } from './run-state'
import { gitHostUser } from './git-hosts'
import type { Page } from '@playwright/test'
import type { GitHostName } from './git-hosts'

/** Signs in on the host's login page and grants TraceHub on its consent screen, after TraceHub sent the browser there. */
export async function authorizeOnGitHost(page: Page, name: GitHostName) {
  const { baseUrl } = gitHostState(name)
  const { username, password } = gitHostUser(name)
  await page.waitForURL(`${baseUrl}/**`)
  await page.getByLabel('Username or Email Address').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.getByRole('button', { name: 'Authorize Application' }).click()
}
