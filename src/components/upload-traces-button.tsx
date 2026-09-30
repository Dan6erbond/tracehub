import { Link } from '@tanstack/react-router'
import { Upload } from 'lucide-react'
import { Button } from '#/components/ui/button'
import type { Id } from '../../convex/_generated/dataModel'
import type { TraceTargetSearch } from '#/lib/schemas/trace-target'

/** Opens the upload sheet for the given target; without one it targets the default branch. */
export function UploadTracesButton({
  repoId,
  target,
}: {
  repoId: Id<'repos'>
  target?: TraceTargetSearch
}) {
  return (
    <Button asChild>
      <Link
        to="/repos/$repoId/traces/create"
        params={{ repoId }}
        search={target ?? {}}
      >
        <Upload />
        Upload traces
      </Link>
    </Button>
  )
}
