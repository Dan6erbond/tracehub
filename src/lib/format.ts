const BYTE_UNITS = ['B', 'KB', 'MB', 'GB']

export function formatBytes(bytes: number) {
  const exponent = Math.min(
    Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  )
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${BYTE_UNITS[exponent]}`
}

export function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`
  const seconds = durationMs / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`
}

export const formatDate = (timestamp: number | Date) =>
  new Date(timestamp).toLocaleDateString()

export const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString()

/** The time between two timestamps, or `undefined` while either is missing. */
export const formatElapsed = (startedAt?: number, completedAt?: number) =>
  startedAt === undefined || completedAt === undefined
    ? undefined
    : formatDuration(completedAt - startedAt)
