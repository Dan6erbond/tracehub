import { gitHostLabels } from '../fixtures/git-hosts'
import { callbackUrlOf, registerProvider } from '../fixtures/providers'
import { gitHostState } from '../fixtures/run-state'
import { expect, test } from '../fixtures/test'

test.describe.configure({ mode: 'serial' })

test('registers Gitea, which lets users sign up with it', async ({ page }) => {
  await registerProvider(page, 'gitea', { allowSignUp: true })
  await expect(page.getByRole('textbox', { name: 'Callback URL' })).toHaveValue(
    callbackUrlOf('gitea'),
  )
  await page.getByRole('button', { name: 'Create provider' }).click()

  await expect(page).toHaveURL(/\/admin\/providers$/)
  await expect(page.getByRole('row', { name: /Gitea/ })).toContainText(
    new URL(gitHostState('gitea').baseUrl).host,
  )
})

test('registers Forgejo, which is trusted for linking', async ({ page }) => {
  await registerProvider(page, 'forgejo', { trustedForLinking: true })
  await expect(page.getByRole('textbox', { name: 'Callback URL' })).toHaveValue(
    callbackUrlOf('forgejo'),
  )
  await page.getByRole('button', { name: 'Create provider' }).click()

  await expect(page).toHaveURL(/\/admin\/providers$/)
  await expect(
    page.getByRole('row', { name: new RegExp(gitHostLabels.forgejo) }),
  ).toContainText(new URL(gitHostState('forgejo').baseUrl).host)
})
