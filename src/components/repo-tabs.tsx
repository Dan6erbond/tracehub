import { Link } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import type { Id } from '../../convex/_generated/dataModel'

/** Navigation between the repo's overview pages; each tab is its own route. */
export function RepoTabs({
  repoId,
  active,
}: {
  repoId: Id<'repos'>
  active: 'branches' | 'pipelines'
}) {
  return (
    <Tabs value={active}>
      <TabsList>
        <TabsTrigger value="branches" asChild>
          <Link to="/repos/$repoId" params={{ repoId }}>
            Branches
          </Link>
        </TabsTrigger>
        <TabsTrigger value="pipelines" asChild>
          <Link to="/repos/$repoId/pipelines" params={{ repoId }}>
            Pipelines
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
