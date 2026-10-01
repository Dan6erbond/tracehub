import { TableAggregate } from '@convex-dev/aggregate'
import { components } from '../_generated/api'
import type { DataModel, Id } from '../_generated/dataModel'

export const runsByJob = new TableAggregate<{
  Namespace: Id<'ciJobs'> | undefined
  Key: number
  DataModel: DataModel
  TableName: 'runs'
}>(components.runsByJob, {
  namespace: (run) => run.jobId,
  sortKey: (run) => run._creationTime,
})
