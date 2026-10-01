import { gitHostLabels } from './git-hosts'
import { gitHostState, runState } from './run-state'
import type { Page } from '@playwright/test'
import type { GitHostName } from './git-hosts'

export type ProviderSwitches = {
  allowSignUp?: boolean
  trustedForLinking?: boolean
}

/** Registers a host from its provider template with the OAuth app that global setup created on it. */
export async function registerProvider(
  page: Page,
  name: GitHostName,
  { allowSignUp, trustedForLinking }: ProviderSwitches,
) {
  const { baseUrl, clientId, clientSecret } = gitHostState(name)
  await page.goto('/admin/providers/new')
  await page.getByRole('link', { name: gitHostLabels[name] }).click()

  await page.getByLabel('Base URL').fill(baseUrl)
  await page.getByLabel('Client ID').fill(clientId)
  await page.getByLabel('Client secret').fill(clientSecret)
  if (allowSignUp)
    await page.getByRole('switch', { name: 'Allow sign-up' }).click()
  if (trustedForLinking)
    await page.getByRole('switch', { name: 'Trusted for linking' }).click()
}

export const callbackUrlOf = (name: GitHostName) =>
  `${runState().appUrl}/api/auth/callback/${name}`
