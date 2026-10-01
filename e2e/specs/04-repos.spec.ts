import { gitHostLabels, gitHostNames } from '../fixtures/git-hosts'
import { repoRow } from '../fixtures/repo-list'
import { gitHostState, repoWithPullRequest } from '../fixtures/run-state'
import { expect, test } from '../fixtures/test'

test.describe.configure({ mode: 'serial' })

test('reloading lists the seeded repositories of both hosts', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Reload' }).click()

  for (const name of gitHostNames)
    for (const { fullName } of gitHostState(name).repos)
      await expect(repoRow(page, fullName)).toBeVisible()
})

for (const name of gitHostNames) {
  const label = gitHostLabels[name]
  test(`${label}: branches, pull request and CI status link to the host`, async ({
    page,
  }) => {
    const { baseUrl } = gitHostState(name)
    const { fullName, pullRequest } = repoWithPullRequest(name)
    const repoUrl = `${baseUrl}/${fullName}`

    await page.goto('/')
    await repoRow(page, fullName).getByRole('link').click()
    await page.getByRole('button', { name: 'Reload' }).click()

    await expect(
      page.getByRole('link', { name: label, exact: true }),
    ).toHaveAttribute('href', repoUrl)
    await expect(
      page.getByRole('link', { name: pullRequest.branch }),
    ).toBeVisible()
    await expect(page.getByText('Failing')).toBeVisible()
    await expect(
      page.getByRole('link', { name: pullRequest.headSha.slice(0, 7) }),
    ).toHaveAttribute('href', `${repoUrl}/commit/${pullRequest.headSha}`)

    await page.getByRole('link', { name: `#${pullRequest.number}` }).click()
    await expect(
      page.getByRole('link', { name: `#${pullRequest.number}` }),
    ).toHaveAttribute('href', `${repoUrl}/pulls/${pullRequest.number}`)
  })
}
