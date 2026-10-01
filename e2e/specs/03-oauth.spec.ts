import { sessionFile } from '../fixtures/accounts'
import { authorizeOnGitHost } from '../fixtures/git-host-login'
import { expect, test } from '../fixtures/test'

test('signs in with Gitea and links Forgejo from the profile', async ({
  page,
}) => {
  await test.step('sign in with Gitea', async () => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in with Gitea' }).click()
    await authorizeOnGitHost(page, 'gitea')
    await expect(
      page.getByRole('heading', { name: 'Repositories' }),
    ).toBeVisible()
    await page.context().storageState({ path: sessionFile('user') })
  })

  await test.step('link Forgejo', async () => {
    await page.goto('/me')
    await page.getByRole('button', { name: 'Connect Forgejo' }).click()
    await authorizeOnGitHost(page, 'forgejo')
    await expect(page).toHaveURL(/\/me$/)
    await expect(page.getByText('Forgejo', { exact: true })).toBeVisible()
  })
})
