import path from 'node:path'
import { projectRoot } from '../support/paths'

export const adminAccount = {
  name: 'Admin',
  email: 'admin@tracehub.test',
  password: 'admin-e2e-password',
}

const stateDirectory = path.join(projectRoot, 'test-results', '.auth')

/** Where a spec stores the browser session of an account for the specs that follow. */
export const sessionFile = (account: 'admin' | 'user') =>
  path.join(stateDirectory, `${account}.json`)
