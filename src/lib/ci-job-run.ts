import type { CiJob } from './schemas/ci-job'
import type { Run } from './schemas/run'

type JobRef = Pick<Run, 'sha' | 'externalRunId' | 'externalJobId' | 'jobName'>

/** A run belongs to the job it names by `externalJobId`; runs without one fall back to the job name within the same pipeline. */
export const jobMatchesRun = (job: CiJob, run: JobRef) => {
  if (job.sha !== run.sha) return false
  if (run.externalJobId !== undefined)
    return run.externalJobId === job.externalId
  if (run.jobName === undefined || run.jobName !== job.name) return false
  return (
    run.externalRunId === undefined ||
    job.pipeline === undefined ||
    run.externalRunId === job.pipeline
  )
}
