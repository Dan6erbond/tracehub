import { expect, test as base } from '@playwright/test'
import { runState } from './run-state'

/** The app's address is only known once global setup has started it, which is after the config is read. */
export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  baseURL: async ({}, use) => {
    await use(runState().appUrl)
  },
})

export { expect }
