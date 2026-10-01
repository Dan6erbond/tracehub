import { Migrations } from '@convex-dev/migrations'
import { components } from './_generated/api'
import schema from './schema'

export const migrations = new Migrations(components.migrations, { schema })
export const run = migrations.runner()
