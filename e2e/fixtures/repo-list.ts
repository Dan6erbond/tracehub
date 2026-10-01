import type { Page } from '@playwright/test'

export const repoRow = (page: Page, fullName: string) =>
  page.getByRole('row', { name: new RegExp(fullName) })
