import { PipelineList } from '#/components/pipeline-list'
import { RepoTabs } from '#/components/repo-tabs'
import type { Id } from '../../convex/_generated/dataModel'

export function RepoPipelinesPage({ repoId }: { repoId: Id<'repos'> }) {
  return (
    <div className="flex flex-col gap-4">
      <RepoTabs repoId={repoId} active="pipelines" />
      <PipelineList repoId={repoId} />
    </div>
  )
}
