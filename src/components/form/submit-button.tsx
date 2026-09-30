import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useFormContext } from './form-context'
import type { ReactNode } from 'react'

export function SubmitButton({ children }: { children: ReactNode }) {
  const form = useFormContext()
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {children}
        </Button>
      )}
    </form.Subscribe>
  )
}
