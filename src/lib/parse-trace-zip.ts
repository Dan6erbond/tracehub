import { strFromU8, unzipSync } from 'fflate'
import { z } from 'zod'
import type { TraceStatus } from './schemas/trace'

const contextOptionsSchema = z.object({
  type: z.literal('context-options'),
  title: z.string().optional(),
  monotonicTime: z.number().optional(),
})
const errorEventSchema = z.object({
  type: z.literal('error'),
  message: z.string().optional(),
})
const afterEventSchema = z.object({
  type: z.literal('after'),
  endTime: z.number(),
})

const parseLines = (data: Uint8Array | undefined) =>
  data
    ? strFromU8(data)
        .split('\n')
        .flatMap((line) => {
          try {
            return [JSON.parse(line) as unknown]
          } catch {
            return []
          }
        })
    : []

export type TraceZipInfo = {
  title?: string
  durationMs?: number
  status?: Extract<TraceStatus, 'passed' | 'failed' | 'timedOut'>
}

const TEST_TIMEOUT_MESSAGE = /^Test timeout of \d+ms exceeded/

/**
 * Reads the test name and duration Playwright stores in a trace zip:
 * `0-trace.trace` starts with a context-options event carrying the test title,
 * `test.trace` holds the test runner's step events (duration = last step end - start)
 * and one `error` event per test error, which is what the trace viewer lists as errors;
 * no error event means the test passed. Skipped and interrupted tests are not told apart.
 */
export async function parseTraceZip(file: File): Promise<TraceZipInfo> {
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter: ({ name }) => name === '0-trace.trace' || name === 'test.trace',
  })

  const { title } = contextOptionsSchema
    .partial()
    .parse(parseLines(entries['0-trace.trace']).at(0) ?? {})

  const testEvents = parseLines(entries['test.trace'])
  const start = contextOptionsSchema.safeParse(testEvents.at(0)).data
    ?.monotonicTime
  const end = Math.max(
    ...testEvents.flatMap((event) => {
      const after = afterEventSchema.safeParse(event)
      return after.success ? [after.data.endTime] : []
    }),
  )
  const durationMs =
    start !== undefined && Number.isFinite(end)
      ? Math.max(0, Math.round(end - start))
      : undefined

  const errors = testEvents.flatMap((event) => {
    const error = errorEventSchema.safeParse(event)
    return error.success ? [error.data] : []
  })
  const status = !('test.trace' in entries)
    ? undefined
    : errors.length === 0
      ? 'passed'
      : errors.some(({ message = '' }) => TEST_TIMEOUT_MESSAGE.test(message))
        ? 'timedOut'
        : 'failed'

  return { title, durationMs, status }
}
