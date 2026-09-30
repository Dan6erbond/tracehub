import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod4'

/** Where uploaded traces go: an existing run (`job`), a pull request, or a branch; none means the default branch. */
export const traceTargetSearchSchema = z.object({
  branch: z.coerce.string().optional(),
  pull: z.coerce.number().int().positive().optional(),
  job: zid('runs').optional(),
})
export type TraceTargetSearch = z.infer<typeof traceTargetSearchSchema>
