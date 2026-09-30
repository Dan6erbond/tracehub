import { CreateRunForm } from '#/components/create-run-form'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { useTraceTarget } from '#/hooks/use-trace-target'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import type { TraceTarget } from '#/hooks/use-trace-target'
import type { TraceTargetSearch } from '#/lib/schemas/trace-target'

const describeTarget = (target: TraceTarget) => {
  switch (target.kind) {
    case 'branch':
      return `Branch ${target.branch}`
    case 'pull':
      return `Pull request #${target.number}: ${target.title}`
    case 'run':
      return `Run ${target.run.title ?? target.run.sha.slice(0, 7)}`
  }
}

export function UploadTracesSheet({
  repo,
  search,
  onClose,
  onCreated,
}: {
  repo: Doc<'repos'>
  search: TraceTargetSearch
  onClose: () => void
  onCreated: (runId: Id<'runs'>) => void
}) {
  const target = useTraceTarget(repo, search)
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Upload traces</SheetTitle>
          <SheetDescription>
            {target ? describeTarget(target) : 'Target not found'}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          {target === undefined && <Skeleton className="h-40 w-full" />}
          {target && (
            <CreateRunForm
              repoId={repo._id}
              target={target}
              onCreated={onCreated}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
