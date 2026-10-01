import { Link } from '@tanstack/react-router'
import { SearchX } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'

export function NotFound({ entity }: { entity: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>{entity} not found</EmptyTitle>
        <EmptyDescription>
          It does not exist or you do not have access to it.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link to="/">Back to repositories</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
