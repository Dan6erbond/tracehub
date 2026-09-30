import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { uploadFile } from '#/lib/upload-file'
import type { Id } from '../../convex/_generated/dataModel'
import type { TraceTarget } from '#/hooks/use-trace-target'
import type { CreateRunFormValues } from '#/lib/schemas/create-run-form'

const emptyToUndefined = (value: string) => value || undefined

/** Uploads each trace zip to Convex storage, then creates the run (or appends to one) in a single mutation. */
export function useSubmitTraces(repoId: Id<'repos'>, target: TraceTarget) {
  const [progress, setProgress] = useState<Record<number, number>>({})
  const generateUploadUrl = useConvexMutation(api.traces.generateUploadUrl)
  const createRunWithTraces = useConvexMutation(api.traces.createRunWithTraces)
  const addTracesToRun = useConvexMutation(api.traces.addTracesToRun)

  const submit = useMutation({
    mutationFn: async ({
      traces: items,
      pinned,
      ...run
    }: CreateRunFormValues): Promise<Id<'runs'>> => {
      const traces = await Promise.all(
        items.map(async (item, index) => ({
          title: item.title,
          status: item.status,
          durationMs: item.durationMs,
          jobName: emptyToUndefined(item.jobName),
          fileName: item.file.name,
          size: item.file.size,
          storageId: await uploadFile(
            await generateUploadUrl({ repoId }),
            item.file,
            (fraction) =>
              setProgress((current) => ({ ...current, [index]: fraction })),
          ),
        })),
      )
      if (target.kind === 'run') {
        await addTracesToRun({ repoId, runId: target.run._id, traces })
        return target.run._id
      }
      return createRunWithTraces({
        repoId,
        traces,
        pinned,
        sha: run.sha,
        title: emptyToUndefined(run.title),
        description: emptyToUndefined(run.description),
        externalRunId: emptyToUndefined(run.externalRunId),
        ciUrl: emptyToUndefined(run.ciUrl),
        branch: target.kind === 'branch' ? target.branch : undefined,
        prNumber: target.kind === 'pull' ? target.number : undefined,
      })
    },
  })

  return { submit, progress }
}
