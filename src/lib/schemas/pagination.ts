import { paginationOptsValidator } from 'convex/server'
import { convexToZod } from 'convex-helpers/server/zod4'

export const paginationOptsSchema = convexToZod(paginationOptsValidator)
