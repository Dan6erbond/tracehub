import { PipelineList } from '#/components/pipeline-list'
import { RepoTabs } from '#/components/repo-tabs'
import type { Doc } from '../../convex/_generated/dataModel'

export function RepoPipelinesPage({ repo }: { repo: Doc<'repos'> }) {
  return (
    <div className="flex flex-col gap-4">
      <RepoTabs repoId={repo._id} active="pipelines" />
      <PipelineList repo={repo} />
    </div>
  )
}
