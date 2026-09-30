import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/_app/repos/$repoId')({
  component: RepoPage,
})

function RepoPage() {
  const { repoId } = Route.useParams()
  const repo = useQuery(convexQuery(api.repos.getRepo, { repoId: repoId }))

  if (repo.isPending) return <Skeleton className="h-10 w-64" />
  if (!repo.data)
    return <p className="text-muted-foreground">Repository not found.</p>

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{repo.data.fullName}</h1>
        <Badge variant="outline">
          {repo.data.private ? 'Private' : 'Public'}
        </Badge>
      </div>
      {repo.data.description && (
        <p className="text-muted-foreground">{repo.data.description}</p>
      )}
    </div>
  )
}
