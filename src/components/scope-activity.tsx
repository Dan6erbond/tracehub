import { CiJobList } from '#/components/ci-job-list'
import { PipelineList } from '#/components/pipeline-list'
import { ScopeRunList } from '#/components/scope-run-list'
import { SectionHeading } from '#/components/section-heading'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { UploadTracesButton } from '#/components/upload-traces-button'
import { useScopeCounts } from '#/hooks/use-runs'
import type { ComponentProps } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import type { RunScope } from '#/lib/schemas/run'

/** The pipelines and trace runs of a branch or pull request, each in its own tab. */
export function ScopeActivity({
  repoId,
  scope,
  headSha,
  uploadTarget,
}: {
  repoId: Id<'repos'>
  scope: RunScope
  headSha?: string
  uploadTarget: ComponentProps<typeof UploadTracesButton>['target']
}) {
  const counts = useScopeCounts(repoId, scope)

  return (
    <Tabs defaultValue="pipelines">
      <div className="flex items-center justify-between gap-4">
        <TabsList>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="runs">Trace runs</TabsTrigger>
        </TabsList>
        <UploadTracesButton repoId={repoId} target={uploadTarget} />
      </div>
      <TabsContent value="pipelines" className="flex flex-col gap-4">
        {headSha && <CiJobList repoId={repoId} sha={headSha} />}
        <div className="flex flex-col gap-3">
          <SectionHeading>Pipelines</SectionHeading>
          <PipelineList repoId={repoId} scope={scope} />
        </div>
      </TabsContent>
      <TabsContent value="runs" className="flex flex-col gap-4">
        {counts.data && <TraceCountsBadges counts={counts.data} />}
        <ScopeRunList repoId={repoId} scope={scope} />
      </TabsContent>
    </Tabs>
  )
}
