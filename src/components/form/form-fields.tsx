import { FieldGroup } from '#/components/ui/field'
import { cn } from '#/lib/utils'
import type { ComponentProps } from 'react'

/** The fields of a form, evenly spaced; the form's own gap separates them from its actions. */
export function FormFields({ className, ...props }: ComponentProps<'div'>) {
  return <FieldGroup className={cn('gap-5', className)} {...props} />
}
