import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod4'
import type { Doc } from '../../../convex/_generated/dataModel'

/** Where uploaded traces go: an existing run (`job`), a pull request, or a branch; none means the default branch. */
export const traceTargetSearchSchema = z.object({
  branch: z.coerce.string().optional(),
  pull: z.coerce.number().int().positive().optional(),
  job: zid('runs').optional(),
})
export type TraceTargetSearch = z.infer<typeof traceTargetSearchSchema>

/** The branch an upload without a pull request or run goes to: the explicit one, else the repo's default. */
export const targetBranch = (
  { branch }: TraceTargetSearch,
  { defaultBranch }: Pick<Doc<'repos'>, 'defaultBranch'>,
) => branch ?? defaultBranch
