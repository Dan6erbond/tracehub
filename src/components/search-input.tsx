import { Search } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  className,
}: Props) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-8"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
