import { CiJobList } from '#/components/ci-job-list'
import { PipelineList } from '#/components/pipeline-list'
import { ScopeRunList } from '#/components/scope-run-list'
import { SectionHeading } from '#/components/section-heading'
import { TraceCountsBadges } from '#/components/trace-counts-badges'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { UploadTracesButton } from '#/components/upload-traces-button'
import { useScopeCounts } from '#/hooks/use-runs'
import type { ComponentProps } from 'react'
import type { Doc } from '../../convex/_generated/dataModel'
import type { RunScope } from '#/lib/schemas/run'

/** The pipelines and trace runs of a branch or pull request, each in its own tab. */
export function ScopeActivity({
  repo,
  scope,
  headSha,
  uploadTarget,
}: {
  repo: Doc<'repos'>
  scope: RunScope
  headSha?: string
  uploadTarget: ComponentProps<typeof UploadTracesButton>['target']
}) {
  const counts = useScopeCounts(repo._id, scope)

  return (
    <Tabs defaultValue="pipelines">
      <div className="flex items-center justify-between gap-4">
        <TabsList>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="runs">Trace runs</TabsTrigger>
        </TabsList>
        <UploadTracesButton repoId={repo._id} target={uploadTarget} />
      </div>
      <TabsContent value="pipelines" className="flex flex-col gap-4">
        {headSha && <CiJobList repo={repo} sha={headSha} />}
        <div className="flex flex-col gap-3">
          <SectionHeading>Pipelines</SectionHeading>
          <PipelineList repo={repo} scope={scope} />
        </div>
      </TabsContent>
      <TabsContent value="runs" className="flex flex-col gap-4">
        {counts.data && <TraceCountsBadges counts={counts.data} />}
        <ScopeRunList repo={repo} scope={scope} />
      </TabsContent>
    </Tabs>
  )
}
