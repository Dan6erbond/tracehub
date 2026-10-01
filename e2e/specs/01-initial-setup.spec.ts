import { adminAccount, sessionFile } from '../fixtures/accounts'
import { expect, test } from '../fixtures/test'

test('a fresh instance asks for the admin account first', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveURL(/\/initial-setup$/)

  const { name, email, password } = adminAccount
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create admin account' }).click()

  await expect(page).toHaveURL(/\/admin\/settings$/)
  await page.context().storageState({ path: sessionFile('admin') })
})
