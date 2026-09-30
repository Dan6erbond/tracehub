import { TableAggregate } from '@convex-dev/aggregate'
import { components } from '../_generated/api'
import type { DataModel, Id } from '../_generated/dataModel'
import type { TraceStatus } from '../../src/lib/schemas/trace'

export const tracesByRun = new TableAggregate<{
  Namespace: Id<'runs'>
  Key: [TraceStatus, number]
  DataModel: DataModel
  TableName: 'traces'
}>(components.tracesByRun, {
  namespace: (trace) => trace.runId,
  sortKey: (trace) => [trace.status, trace._creationTime],
})

export const tracesByBranch = new TableAggregate<{
  Namespace: Id<'repos'>
  Key: [string, TraceStatus, number]
  DataModel: DataModel
  TableName: 'traces'
}>(components.tracesByBranch, {
  namespace: (trace) => trace.repoId,
  sortKey: (trace) => [trace.branch ?? '', trace.status, trace._creationTime],
})

export const tracesByPull = new TableAggregate<{
  Namespace: Id<'repos'>
  Key: [number, TraceStatus, string, number]
  DataModel: DataModel
  TableName: 'traces'
}>(components.tracesByPull, {
  namespace: (trace) => trace.repoId,
  sortKey: (trace) => [
    trace.prNumber ?? 0,
    trace.status,
    trace.branch ?? '',
    trace._creationTime,
  ],
})
