import type { Id } from '../../convex/_generated/dataModel'

export const traceZipPath = (repoId: Id<'repos'>, traceId: Id<'traces'>) =>
  `/api/repos/${repoId}/traces/${traceId}/trace.zip`

/** The self-hosted Playwright trace viewer (see `scripts/copy-trace-viewer.mjs`) opened on one of our traces. */
export const traceViewerPath = (repoId: Id<'repos'>, traceId: Id<'traces'>) =>
  `/trace/index.html?trace=${encodeURIComponent(traceZipPath(repoId, traceId))}`
