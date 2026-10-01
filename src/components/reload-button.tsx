import { RefreshCw } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

export function ReloadButton({
  reload: { isPending, mutate },
}: {
  reload: { isPending: boolean; mutate: () => void }
}) {
  return (
    <Button variant="outline" disabled={isPending} onClick={() => mutate()}>
      <RefreshCw className={cn(isPending && 'animate-spin')} />
      Reload
    </Button>
  )
}
