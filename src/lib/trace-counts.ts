import { traceStatusSchema } from './schemas/trace'
import type { TraceCounts } from './schemas/trace'

export const sumTraceCounts = (counts: Array<TraceCounts>): TraceCounts => ({
  total: counts.reduce((sum, { total }) => sum + total, 0),
  byStatus: Object.fromEntries(
    traceStatusSchema.options.map((status) => [
      status,
      counts.reduce((sum, { byStatus }) => sum + byStatus[status], 0),
    ]),
  ) as TraceCounts['byStatus'],
})
